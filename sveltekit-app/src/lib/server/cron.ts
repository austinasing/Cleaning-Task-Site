/**
 * Cron Jobs for the Cleaning Task App
 *
 * This module sets up scheduled tasks using node-cron:
 * 1. Daily unclaimed fines check (6:00 AM)
 */

import cron from 'node-cron';
import { ObjectId } from 'mongodb';
import {
	getSubtasksCollection,
	getHallwayTransactionsCollection,
	getTaskGroupsCollection,
	getUsersCollection,
	getWeeksCollection,
	getUserFinesForWeek
} from './db';
import type { Subtask } from './db';

const MAX_FINE_PER_WEEK = 15;

// Subtask templates for each task group (used to auto-provision subtasks for new active weeks)
const SUBTASK_TEMPLATES: Record<string, Array<{ name: string; blockoutDay: number; order: number }>> = {
	kitchen_fri: [
		{ name: 'Sinks', blockoutDay: 5, order: 1 },
		{ name: 'Hotplate', blockoutDay: 5, order: 2 },
		{ name: 'Island', blockoutDay: 5, order: 3 },
		{ name: 'Counters', blockoutDay: 5, order: 4 },
		{ name: 'Chill Area', blockoutDay: 5, order: 5 },
		{ name: 'Sweep', blockoutDay: 5, order: 6 },
		{ name: 'Mop', blockoutDay: 5, order: 7 },
		{ name: 'Towels', blockoutDay: 5, order: 8 },
		{ name: 'Drying racks', blockoutDay: 5, order: 9 }
	],
	kitchen_mon: [
		{ name: 'Sinks', blockoutDay: 1, order: 1 },
		{ name: 'Hotplate', blockoutDay: 1, order: 2 },
		{ name: 'Island', blockoutDay: 1, order: 3 },
		{ name: 'Counters', blockoutDay: 1, order: 4 },
		{ name: 'Chill Area', blockoutDay: 1, order: 5 },
		{ name: 'Sweep', blockoutDay: 1, order: 6 },
		{ name: 'Mop', blockoutDay: 1, order: 7 },
		{ name: 'Towels', blockoutDay: 1, order: 8 },
		{ name: 'Drying racks', blockoutDay: 1, order: 9 }
	],
	toilet_front: [
		{ name: 'Seat + Bowl', blockoutDay: 1, order: 1 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 2 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 3 },
		{ name: 'Sink + Mirror', blockoutDay: 1, order: 4 },
		{ name: 'Walls + Door', blockoutDay: 1, order: 5 },
		{ name: 'Top up TP', blockoutDay: 1, order: 6 }
	],
	toilet_back: [
		{ name: 'Seat + Bowl', blockoutDay: 1, order: 1 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 2 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 3 },
		{ name: 'Sink + Mirror', blockoutDay: 1, order: 4 },
		{ name: 'Walls + Door', blockoutDay: 1, order: 5 },
		{ name: 'Top up TP', blockoutDay: 1, order: 6 }
	],
	bathroom: [
		{ name: 'Mid-Week Drains (Fri)', blockoutDay: 5, order: 1 },
		{ name: 'Front Cabins / Floor', blockoutDay: 1, order: 2 },
		{ name: 'Back Cabins / Floor', blockoutDay: 1, order: 3 },
		{ name: 'Sinks', blockoutDay: 1, order: 4 },
		{ name: 'Mirrors + Shelves', blockoutDay: 1, order: 5 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 6 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 7 },
		{ name: 'Clean Drains', blockoutDay: 1, order: 8 }
	],
	hallway: [
		{ name: 'Sweep', blockoutDay: 1, order: 1 },
		{ name: 'Mop', blockoutDay: 1, order: 2 }
	],
	garbage: [
		{ name: 'Glass', blockoutDay: 1, order: 1 },
		{ name: 'Paper', blockoutDay: 1, order: 2 },
		{ name: 'Check Bags (Wed)', blockoutDay: 3, order: 3 },
		{ name: 'Check Bags (Fri)', blockoutDay: 5, order: 4 },
		{ name: 'Check Bags (Mon)', blockoutDay: 1, order: 5 },
		{ name: 'Clean Bins', blockoutDay: 1, order: 6 }
	],
	supplies: [
		{ name: 'Air Freshener', blockoutDay: 1, order: 1 },
		{ name: 'Cleaning Liquid', blockoutDay: 1, order: 2 },
		{ name: 'Cleaning Spray', blockoutDay: 1, order: 3 },
		{ name: 'Dish Soap', blockoutDay: 1, order: 4 },
		{ name: 'Gloves', blockoutDay: 1, order: 5 },
		{ name: 'Hand Soap', blockoutDay: 1, order: 6 },
		{ name: 'Kitchen Paper', blockoutDay: 1, order: 7 },
		{ name: 'Toilet Paper', blockoutDay: 1, order: 8 },
		{ name: 'Trash Bags', blockoutDay: 1, order: 9 }
	]
};

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
	console.log('[CRON] Initializing cron jobs...');

	// ========================================
	// Advance week statuses on startup
	// ========================================
	advanceWeekStatuses().catch((error) => {
		console.error('[CRON] Error advancing week statuses on startup:', error);
	});

	// ========================================
	// Hourly week status advancement
	// ========================================
	// Ensures the active week stays current even without restarts
	cron.schedule('0 * * * *', async () => {
		console.log('[CRON] Running hourly week status advancement...');
		try {
			await advanceWeekStatuses();
		} catch (error) {
			console.error('[CRON] Error advancing week statuses:', error);
		}
	});

	// ========================================
	// Daily check for unclaimed fines
	// ========================================
	// Runs daily at 6:00 AM (after blockout times)
	cron.schedule('0 6 * * *', async () => {
		console.log('[CRON] Running daily unclaimed fines check...');
		try {
			await processUnclaimedFines();
		} catch (error) {
			console.error('[CRON] Error processing unclaimed fines:', error);
		}
	});

	console.log('[CRON] Cron jobs scheduled:');
	console.log('  - Hourly week status advancement: every hour');
	console.log('  - Daily unclaimed fines check: 6:00 AM');
}

/**
 * Advance week statuses based on the current date.
 *
 * - Weeks whose endDate has passed are marked 'completed'
 * - The week containing the current date is marked 'active'
 * - All other weeks remain 'future'
 *
 * Called on server startup and hourly via cron.
 */
export async function advanceWeekStatuses(): Promise<void> {
	const weeksColl = await getWeeksCollection();
	const subtasksColl = await getSubtasksCollection();
	const taskGroupsColl = await getTaskGroupsCollection();
	const now = new Date();

	// Mark all expired weeks as completed
	const completedResult = await weeksColl.updateMany(
		{ endDate: { $lt: now }, status: { $ne: 'completed' } },
		{ $set: { status: 'completed' } }
	);

	// Mark the current week as active (startDate <= now <= endDate)
	const activeResult = await weeksColl.updateMany(
		{
			startDate: { $lte: now },
			endDate: { $gte: now },
			status: { $ne: 'active' }
		},
		{ $set: { status: 'active' } }
	);

	// Mark future weeks that were incorrectly set as active back to future
	const futureResult = await weeksColl.updateMany(
		{ startDate: { $gt: now }, status: 'active' },
		{ $set: { status: 'future' } }
	);

	if (completedResult.modifiedCount || activeResult.modifiedCount || futureResult.modifiedCount) {
		console.log(
			`[CRON] Week statuses updated: ${completedResult.modifiedCount} completed, ` +
				`${activeResult.modifiedCount} activated, ${futureResult.modifiedCount} reset to future`
		);
	}

	// Auto-provision subtasks for the active week if it has none
	const activeWeek = await weeksColl.findOne({ status: 'active' });
	if (activeWeek) {
		const existingSubtasks = await subtasksColl.countDocuments({ weekId: activeWeek._id });
		if (existingSubtasks === 0) {
			console.log(`[CRON] Active week ${activeWeek.weekNumber}/${activeWeek.year} has no subtasks, provisioning...`);

			// Get task group names that have templates
			const taskGroups = await taskGroupsColl.find().toArray();
			const taskGroupNames = taskGroups.map((g) => g.name).filter((name) => SUBTASK_TEMPLATES[name]);

			const subtasks: Omit<Subtask, '_id'>[] = [];
			for (const groupName of taskGroupNames) {
				const templates = SUBTASK_TEMPLATES[groupName];
				if (!templates) continue;

				for (const template of templates) {
					subtasks.push({
						weekId: activeWeek._id!,
						taskGroupName: groupName,
						subtaskName: template.name,
						blockoutDay: template.blockoutDay,
						completedBy: null,
						completedAt: null,
						lateCompletedBy: null,
						lateCompletedAt: null,
						daysLate: 0,
						forgotten: false,
						forgottenBy: null,
						smilesBy: [],
						frownsBy: [],
						order: template.order,
						unclaimedFineProcessed: false,
						updatedAt: now
					});
				}
			}

			if (subtasks.length > 0) {
				await subtasksColl.insertMany(subtasks as Subtask[]);
				console.log(`[CRON] Provisioned ${subtasks.length} subtasks for week ${activeWeek.weekNumber}/${activeWeek.year}`);
			}
		}
	}
}

/**
 * Process unclaimed fines for subtasks that are 3+ days past deadline
 * with no participation from team members.
 */
async function processUnclaimedFines() {
	const subtasksColl = await getSubtasksCollection();
	const transactionsColl = await getHallwayTransactionsCollection();
	const taskGroupsColl = await getTaskGroupsCollection();
	const usersColl = await getUsersCollection();
	const weeksColl = await getWeeksCollection();

	const now = new Date();

	// Find subtasks that:
	// - Are not completed on time (completedBy is null)
	// - Are not completed late (lateCompletedBy is null)
	// - Are not marked as forgotten (forgotten is false)
	// - Haven't been processed for unclaimed fines yet
	const incompleteSubtasks = await subtasksColl
		.find({
			completedBy: null,
			lateCompletedBy: null,
			forgotten: false,
			unclaimedFineProcessed: { $ne: true }
		})
		.toArray();

	if (incompleteSubtasks.length === 0) {
		console.log('[CRON] No incomplete subtasks to process');
		return;
	}

	// Get all weeks for deadline calculation
	const weeks = await weeksColl.find().toArray();
	const weekMap = new Map(weeks.map((w) => [w._id.toString(), w]));

	// Get all task groups for member lookup
	const taskGroups = await taskGroupsColl.find().toArray();
	const taskGroupMap = new Map(taskGroups.map((g) => [g.name, g]));

	// Group subtasks by weekId + taskGroupName
	const groupedSubtasks = new Map<string, typeof incompleteSubtasks>();

	for (const subtask of incompleteSubtasks) {
		const week = weekMap.get(subtask.weekId.toString());
		if (!week) continue;

		// Calculate the blockout deadline for this subtask
		const blockoutDeadline = getBlockoutDeadline(week.startDate, subtask.blockoutDay);

		// Check if 3+ days have passed since deadline
		const daysSinceDeadline = Math.floor(
			(now.getTime() - blockoutDeadline.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysSinceDeadline < 3) {
			continue; // Not yet 3 days past deadline
		}

		// Group by week + taskGroup
		const key = `${subtask.weekId.toString()}_${subtask.taskGroupName}`;
		if (!groupedSubtasks.has(key)) {
			groupedSubtasks.set(key, []);
		}
		groupedSubtasks.get(key)!.push(subtask);
	}

	console.log(`[CRON] Found ${groupedSubtasks.size} task groups with overdue subtasks`);

	// Process each group
	for (const [key, subtasks] of groupedSubtasks) {
		const [weekIdStr, taskGroupName] = key.split('_');
		const weekId = new ObjectId(weekIdStr);
		const taskGroup = taskGroupMap.get(taskGroupName);

		if (!taskGroup || taskGroup.members.length === 0) {
			console.log(`[CRON] Skipping ${taskGroupName} - no members assigned`);
			continue;
		}

		// Check participation for each member
		// Participation = user's name appears in completedBy, lateCompletedBy, or forgottenBy
		// on ANY subtask for this week/taskgroup
		const allSubtasksForGroup = await subtasksColl
			.find({ weekId, taskGroupName })
			.toArray();

		const memberParticipation = new Map<string, boolean>();
		for (const member of taskGroup.members) {
			const participated = allSubtasksForGroup.some(
				(s) =>
					s.completedBy === member.name ||
					s.lateCompletedBy === member.name ||
					s.forgottenBy === member.name
			);
			memberParticipation.set(member.userId.toString(), participated);
		}

		// Determine who gets fined
		const membersToFine: { userId: ObjectId; name: string }[] = [];
		for (const member of taskGroup.members) {
			const participated = memberParticipation.get(member.userId.toString());
			if (!participated) {
				// Only fine non-participants
				membersToFine.push({ userId: member.userId, name: member.name });
			} else {
				// If they participated, check if both participated (both get fined)
				const bothParticipated = Array.from(memberParticipation.values()).every((p) => p);
				if (bothParticipated) {
					membersToFine.push({ userId: member.userId, name: member.name });
				}
			}
		}

		if (membersToFine.length === 0) {
			console.log(`[CRON] Skipping ${taskGroupName} - all tasks accounted for`);
			// Mark subtasks as processed
			await subtasksColl.updateMany(
				{ _id: { $in: subtasks.map((s) => s._id) } },
				{ $set: { unclaimedFineProcessed: true, updatedAt: now } }
			);
			continue;
		}

		// Create fines for each member to be fined
		const claimGroupId =
			membersToFine.length === 2 &&
			!memberParticipation.get(membersToFine[0].userId.toString()) &&
			!memberParticipation.get(membersToFine[1].userId.toString())
				? new ObjectId() // Both non-participants = paired, claimable
				: null;

		const transactions = [];
		for (let i = 0; i < membersToFine.length; i++) {
			const member = membersToFine[i];

			// Check existing fines for this user this week (15€ cap)
			const existingFines = await getUserFinesForWeek(member.userId, weekId);
			const remainingCap = MAX_FINE_PER_WEEK - existingFines;

			if (remainingCap <= 0) {
				console.log(`[CRON] ${member.name} already at 15€ cap for this week`);
				continue;
			}

			const fineAmount = Math.min(MAX_FINE_PER_WEEK, remainingCap);

			const pairedUserId =
				claimGroupId && membersToFine.length === 2
					? membersToFine[1 - i].userId
					: null;

			transactions.push({
				userId: member.userId,
				type: 'task_fine' as const,
				amount: -fineAmount,
				description: `Unclaimed task: ${taskGroup.displayName}`,
				weekId,
				taskGroupName,
				relatedSubtaskId: null,
				status: claimGroupId ? ('unclaimed' as const) : ('outstanding' as const),
				claimGroupId,
				pairedUserId,
				approvedByUserId: null,
				approvedAt: null,
				createdAt: now,
				updatedAt: now
			});
		}

		if (transactions.length > 0) {
			await transactionsColl.insertMany(transactions);

			// Update user balances
			for (const tx of transactions) {
				await usersColl.updateOne(
					{ _id: tx.userId },
					{
						$inc: { hallwayBalance: tx.amount },
						$set: { updatedAt: now }
					}
				);
			}

			console.log(
				`[CRON] Created ${transactions.length} unclaimed fines for ${taskGroupName}`
			);
		}

		// Mark subtasks as processed
		await subtasksColl.updateMany(
			{ _id: { $in: subtasks.map((s) => s._id) } },
			{ $set: { unclaimedFineProcessed: true, updatedAt: now } }
		);
	}

	console.log('[CRON] Unclaimed fines processing complete');
}

/**
 * Calculate the blockout deadline for a subtask based on week start and blockout day
 */
function getBlockoutDeadline(weekStartDate: Date, blockoutDay: number): Date {
	// weekStartDate is typically Tuesday
	// blockoutDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

	const deadline = new Date(weekStartDate);

	// Calculate days from Tuesday (weekStart) to blockoutDay
	const weekStartDay = weekStartDate.getDay(); // 0-6
	let daysToAdd = blockoutDay - weekStartDay;
	if (daysToAdd < 0) {
		daysToAdd += 7; // Wrap to next week
	}

	deadline.setDate(deadline.getDate() + daysToAdd);

	// Set to 6:00 AM (typical blockout time)
	deadline.setHours(6, 0, 0, 0);

	return deadline;
}
