/**
 * POST /api/balance/payment
 *
 * Admin/accountant records a payment or adjustment for a user.
 * Creates a transaction and updates the user's hallwayBalance.
 *
 * Use cases:
 * - User pays their hallway debt (positive amount)
 * - Supply reimbursement (positive amount)
 * - Manual fine adjustment (negative amount)
 *
 * Request body: {
 *   userId: string,       // User receiving the payment/adjustment
 *   amount: number,       // Positive = credit, negative = charge
 *   type: "payment" | "supply_reimbursment" | "task_fine",
 *   description: string   // Human-readable explanation
 * }
 *
 * Response: { transaction, newBalance }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUsersCollection,
	getHallwayTransactionsCollection,
	toObjectId
} from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admin and accountant can record payments
	if (locals.user.role !== 'admin' && locals.user.role !== 'accountant') {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const { userId, amount, type, description } = await request.json();

	// Validate inputs
	if (!userId) {
		return json({ error: 'userId is required' }, { status: 400 });
	}

	if (typeof amount !== 'number' || amount === 0) {
		return json({ error: 'amount must be a non-zero number' }, { status: 400 });
	}

	const validTypes = ['payment', 'supply_reimbursment', 'task_fine'];
	if (!type || !validTypes.includes(type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	if (!description || typeof description !== 'string') {
		return json({ error: 'description is required' }, { status: 400 });
	}

	const id = toObjectId(userId);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const transactionsColl = await getHallwayTransactionsCollection();

	// Verify target user exists
	const targetUser = await usersColl.findOne({ _id: id });
	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const now = new Date();

	// Create the transaction record
	const transaction = {
		userId: id,
		type: type as 'payment' | 'supply_reimbursment' | 'task_fine',
		amount,
		description,
		weekId: null,
		taskGroupName: null,
		relatedSubtaskId: null,
		status: 'outstanding' as const,
		claimGroupId: null,
		pairedUserId: null,
		approvedByUserId: null,
		approvedAt: null,
		createdAt: now,
		updatedAt: now
	};

	await transactionsColl.insertOne(transaction);

	// Update user's balance
	// $inc atomically adds to the current value (handles concurrency safely)
	const updatedUser = await usersColl.findOneAndUpdate(
		{ _id: id },
		{
			$inc: { hallwayBalance: amount },
			$set: { updatedAt: now }
		},
		{ returnDocument: 'after', projection: { hallwayBalance: 1, name: 1 } }
	);

	return json({
		transaction,
		newBalance: updatedUser?.hallwayBalance ?? targetUser.hallwayBalance + amount
	});
};
