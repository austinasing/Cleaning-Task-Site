/**
 * Database Connection Layer
 *
 * This file establishes a connection to MongoDB and provides:
 * 1. TypeScript interfaces for all collections (type safety)
 * 2. Helper functions to access collections
 * 3. Connection pooling (reuses same connection across requests)
 *
 * IMPORTANT: This file is in src/lib/server/ which means it ONLY runs on the server.
 * Database credentials and connections are never exposed to the browser.
 */

import { MongoClient, ObjectId, type Db, type Collection } from 'mongodb';
import { env } from '$env/dynamic/private';

// ===================================
// TYPESCRIPT INTERFACES
// ===================================
// These define the shape of our data for type checking

/**
 * User collection
 * Stores individual user accounts (replaces old "roommates" shared login)
 */
export interface User {
	_id?: ObjectId;
	name: string;
	email?: string; // Optional - unclaimed users don't have this field
	passwordHash: string; // bcrypt hashed password (empty string = unclaimed)
	role: 'member' | 'admin' | 'accountant';
	emoji: string;
	active: boolean; // Whether user is currently in the house
	taskTeam?: number | null; // Task rotation team (1-8), null for non-rotating users (e.g., supplies)
	stats: {
		tasksCompleted: number;
		lateTasks: number;
		timesForgot: number;
		// smiles/frowns moved to per-subtask tracking (Subtask.smiles/frowns arrays)
		// Aggregated on the fly via GET /api/users/[id]/feedback
	};
	preferences: {
		emailNotifications: boolean;
	};
	hallwayBalance: number; // Current balance in EUR (negative = owes money)
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Week collection
 * Tracks weekly cycles for task assignments and history
 */
export interface Week {
	_id?: ObjectId;
	weekNumber: number; // Sequential week number
	year: number;
	startDate: Date; // Monday (actually Tuesday 6AM in this system)
	endDate: Date; // Sunday (actually following Tuesday 5:59AM)
	status: 'completed' | 'active' | 'future'; // completed=past, active=current, future=upcoming (admin-only)
	rotationPeriod?: number; // 1-16, indicates which column in the rotation CSV to use
	assignmentOverrides?: {
		// Manual assignments that override automatic rotation for this week only
		// Key = taskGroupName, Value = array of user IDs
		[taskGroupName: string]: string[];
	};
}

/**
 * TaskGroup collection
 * Groups of tasks with assigned members (e.g., "Kitchen (Fri)", "Bathroom")
 */
export interface TaskGroup {
	_id?: ObjectId;
	name: string; // Unique identifier (e.g., "kitchen_fri", "supplies")
	displayName: string; // Human-readable (e.g., "Kitchen (Fri)")
	members: Array<{
		// Array can have 0-2 members typically
		userId: ObjectId;
		name: string; // Denormalized for fast display
	}>;
	order?: number; // Optional display order on page
	updatedAt: Date;
}

/**
 * Subtask collection
 * Individual tasks within a task group, linked to specific weeks
 * Also tracks late completion (no separate lateTasks collection)
 */
export interface Subtask {
	_id?: ObjectId;
	weekId: ObjectId; // Links to specific week for history
	taskGroupName: string; // e.g., "kitchen_fri", "Supplies" (note: case varies!)
	subtaskName: string; // e.g., "Sinks", "Toilet Paper"
	blockoutDay: number; // 0-6 (Sun-Sat) for blockout logic
	// On-time completion tracking
	completedBy: string | null; // User name who completed it
	completedAt: Date | null;
	// Late completion tracking (replaces separate lateTasks collection)
	lateCompletedBy: string | null;
	lateCompletedAt: Date | null;
	daysLate: number; // 0 if on time, 1-3 if late
	forgotten: boolean; // True if no one completed (goes to both team members)
	forgottenBy: string | null; // User who marked it as forgotten
	// Feedback: arrays of user names who voted (enforces one vote per user server-side)
	smilesBy: string[];
	frownsBy: string[];
	order: number; // Display order within task group
	unclaimedFineProcessed: boolean; // True once cron has created unclaimed fines for this subtask
	updatedAt: Date;
}

/**
 * HallwayTransaction collection
 * Financial transactions for hallway balance (fines, payments, charges)
 *
 * Status flow:
 * - User claims by submitting late: outstanding → paid_pending → resolved
 * - Unclaimed backup fines: unclaimed → (claimed by one OR paid_pending) → resolved
 */
export interface HallwayTransaction {
	_id?: ObjectId;
	userId: ObjectId;
	type: 'task_fine' | 'supply_reimbursment' | 'payment' | 'payment_request' | 'fine_payment';
	amount: number; // Negative for charges/fines, positive for payments/credits
	description: string; // e.g., "Late task: Kitchen (Fri) (2 days late)"

	// For task fines - track which week/taskgroup to enforce 15€ cap
	weekId: ObjectId | null; // Links to the week
	taskGroupName: string | null; // e.g., "kitchen_fri"
	relatedSubtaskId: ObjectId | null; // Legacy - kept for backwards compatibility

	// Status: unclaimed (paired, claimable), claimed (one took responsibility),
	// outstanding (normal fine), paid_pending (awaiting approval), resolved (done), waived (cancelled/forgiven), rejected (denied)
	status: 'unclaimed' | 'claimed' | 'outstanding' | 'paid_pending' | 'resolved' | 'waived' | 'rejected';

	// For paired unclaimed fines (backup scenario when neither participated)
	claimGroupId: ObjectId | null; // Links two unclaimed fines together
	pairedUserId: ObjectId | null; // The other person's userId

	// For payment approval workflow
	approvedByUserId: ObjectId | null; // Admin/accountant who approved
	approvedAt: Date | null;

	createdAt: Date;
	updatedAt: Date;
}

/**
 * Wishlist collection
 * Items that users want to purchase for the house
 */
export interface WishlistItem {
	_id?: ObjectId;
	item: string;
	votes: ObjectId[]; // Array of user IDs who upvoted
	createdAt: Date;
}

/**
 * ExtraTasks collection
 * Additional one-off tasks outside the regular weekly cycle
 * Users can claim these for extra credit (reduces hallway balance)
 */
export interface ExtraTask {
	_id?: ObjectId;
	taskDescription: string;
	value: number; // How much it's worth in EUR
	createdBy: string; // User name who created the task
	completedBy: string | null; // User name who completed it
	status: 'available' | 'pending' | 'completed';
	createdAt: Date;
}

/**
 * TaskGroupNotes collection
 * Individual tips for a task group, one document per note.
 * Multiple users can add notes; deletion uses _id.
 */
export interface TaskGroupNote {
	_id?: ObjectId;
	taskGroupName: string; // e.g., "kitchen_fri", "supplies"
	text: string;
	addedBy: string;    // User name — used for ownership checks on delete
	addedAt: Date;
}

// ===================================
// DATABASE CONNECTION
// ===================================

/**
 * Global MongoDB client (singleton pattern)
 * We reuse the same connection across all requests for efficiency
 */
let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connects to MongoDB and returns the database instance
 * Uses connection pooling - only creates ONE connection for the entire app
 */
export async function connectToDatabase(): Promise<Db> {
	// If already connected, return existing connection
	if (db) {
		return db;
	}

	try {
		// Build MongoDB connection URI from environment variables
		const MONGO_URI =
			env.MONGO_URI ||
			`mongodb://${env.MONGO_ROOT_USER}:${env.MONGO_ROOT_PASSWORD}@mongodb:27017/${env.MONGO_DATABASE}?authSource=admin`;

		const MONGO_DATABASE = env.MONGO_DATABASE || 'cleaning_tasks';

		// Create new MongoDB client
		client = new MongoClient(MONGO_URI);

		// Connect to MongoDB
		await client.connect();

		// Get database instance
		db = client.db(MONGO_DATABASE);

		console.log('✅ Connected to MongoDB');

		return db;
	} catch (error) {
		console.error('❌ MongoDB connection error:', error);
		throw new Error('Failed to connect to database');
	}
}

/**
 * Closes the database connection
 * Should be called when the server shuts down
 */
export async function closeDatabase(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
		console.log('🔒 MongoDB connection closed');
	}
}

// ===================================
// COLLECTION HELPERS
// ===================================
// These functions provide typed access to each collection

/**
 * Get the users collection with type safety
 */
export async function getUsersCollection(): Promise<Collection<User>> {
	const database = await connectToDatabase();
	return database.collection<User>('users');
}

/**
 * Get the weeks collection with type safety
 */
export async function getWeeksCollection(): Promise<Collection<Week>> {
	const database = await connectToDatabase();
	return database.collection<Week>('weeks');
}

/**
 * Get the taskGroups collection with type safety
 */
export async function getTaskGroupsCollection(): Promise<Collection<TaskGroup>> {
	const database = await connectToDatabase();
	return database.collection<TaskGroup>('taskGroups');
}

/**
 * Get the subtasks collection with type safety
 */
export async function getSubtasksCollection(): Promise<Collection<Subtask>> {
	const database = await connectToDatabase();
	return database.collection<Subtask>('subtasks');
}

/**
 * Get the hallwayTransactions collection with type safety
 */
export async function getHallwayTransactionsCollection(): Promise<
	Collection<HallwayTransaction>
> {
	const database = await connectToDatabase();
	return database.collection<HallwayTransaction>('hallwayTransactions');
}

/**
 * Get the wishlist collection with type safety
 */
export async function getWishlistCollection(): Promise<Collection<WishlistItem>> {
	const database = await connectToDatabase();
	return database.collection<WishlistItem>('wishlist');
}

/**
 * Get the extraTasks collection with type safety
 */
export async function getExtraTasksCollection(): Promise<Collection<ExtraTask>> {
	const database = await connectToDatabase();
	return database.collection<ExtraTask>('extraTasks');
}

/**
 * Get the taskGroupNotes collection with type safety
 */
export async function getTaskGroupNotesCollection(): Promise<Collection<TaskGroupNote>> {
	const database = await connectToDatabase();
	return database.collection<TaskGroupNote>('taskGroupNotes');
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Helper to validate and convert string to ObjectId
 * Returns null if invalid
 */
export function toObjectId(id: string | undefined | null): ObjectId | null {
	if (!id) return null;
	try {
		return new ObjectId(id);
	} catch {
		return null;
	}
}

/**
 * Helper to check if a string is a valid ObjectId
 */
export function isValidObjectId(id: string | undefined | null): boolean {
	if (!id) return false;
	return ObjectId.isValid(id);
}

// ===================================
// BALANCE CALCULATION
// ===================================

/**
 * Recalculates a user's hallway balance from their transactions.
 * Only counts transactions where status is NOT 'paid_pending' or 'waived'.
 * Updates the User.hallwayBalance field and returns the corrected balance.
 */
export async function recalculateUserBalance(userId: ObjectId): Promise<number> {
	const transactionsColl = await getHallwayTransactionsCollection();
	const usersColl = await getUsersCollection();

	// Sum all transactions that should affect balance
	// Exclude: paid_pending (not yet approved), waived (cancelled), rejected (denied)
	const result = await transactionsColl
		.aggregate([
			{
				$match: {
					userId,
					status: { $nin: ['paid_pending', 'waived', 'rejected'] }
				}
			},
			{
				$group: {
					_id: null,
					total: { $sum: '$amount' }
				}
			}
		])
		.toArray();

	const calculatedBalance = result[0]?.total ?? 0;

	// Update user document with correct balance
	await usersColl.updateOne(
		{ _id: userId },
		{ $set: { hallwayBalance: calculatedBalance, updatedAt: new Date() } }
	);

	return calculatedBalance;
}

/**
 * Gets the total fines for a user in a specific week (across ALL task groups).
 * Used to enforce the 15€ cap per person per week.
 */
export async function getUserFinesForWeek(userId: ObjectId, weekId: ObjectId): Promise<number> {
	const transactionsColl = await getHallwayTransactionsCollection();

	const result = await transactionsColl
		.aggregate([
			{
				$match: {
					userId,
					weekId,
					type: 'task_fine',
					status: { $nin: ['waived'] } // Count all non-waived fines
				}
			},
			{
				$group: {
					_id: null,
					total: { $sum: '$amount' }
				}
			}
		])
		.toArray();

	// Return absolute value (fines are stored as negative)
	return Math.abs(result[0]?.total ?? 0);
}
