/**
 * Admin Transaction Management
 *
 * POST /api/admin/transactions - Create custom fine/payment
 * PATCH /api/admin/transactions - Modify existing transaction
 * DELETE /api/admin/transactions - Delete transaction
 *
 * All endpoints require admin or accountant role.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getHallwayTransactionsCollection,
	getUsersCollection,
	getWeeksCollection,
	recalculateUserBalance,
	toObjectId
} from '$lib/server/db';
import type { HallwayTransaction } from '$lib/server/db';

/**
 * POST - Create a custom transaction
 *
 * Body: {
 *   userId: string,
 *   amount: number,      // Negative for fines, positive for credits
 *   description: string,
 *   type?: string,       // Default: 'task_fine' for negative, 'payment' for positive
 *   weekId?: string,     // Optional, for tracking
 *   taskGroupName?: string
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'accountant')) {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const { userId, amount, description, type, weekId, taskGroupName } = await request.json();

	if (!userId) {
		return json({ error: 'userId is required' }, { status: 400 });
	}

	if (typeof amount !== 'number' || amount === 0) {
		return json({ error: 'amount must be a non-zero number' }, { status: 400 });
	}

	if (!description || typeof description !== 'string') {
		return json({ error: 'description is required' }, { status: 400 });
	}

	const targetUserId = toObjectId(userId);
	if (!targetUserId) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const transactionsColl = await getHallwayTransactionsCollection();

	// Verify user exists
	const targetUser = await usersColl.findOne({ _id: targetUserId });
	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const now = new Date();

	// Determine type based on amount if not specified
	let transactionType: HallwayTransaction['type'] = 'task_fine';
	if (type) {
		const validTypes = ['task_fine', 'supply_reimbursment', 'payment'];
		if (!validTypes.includes(type)) {
			return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
		}
		transactionType = type as HallwayTransaction['type'];
	} else {
		transactionType = amount < 0 ? 'task_fine' : 'payment';
	}

	const transaction = {
		userId: targetUserId,
		type: transactionType,
		amount,
		description,
		weekId: weekId ? toObjectId(weekId) : null,
		taskGroupName: taskGroupName || null,
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
	await usersColl.updateOne(
		{ _id: targetUserId },
		{
			$inc: { hallwayBalance: amount },
			$set: { updatedAt: now }
		}
	);

	return json({
		success: true,
		transaction,
		newBalance: targetUser.hallwayBalance + amount
	});
};

/**
 * PATCH - Modify an existing transaction
 *
 * Body: {
 *   transactionId: string,
 *   amount?: number,
 *   description?: string,
 *   status?: string
 * }
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'accountant')) {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const { transactionId, amount, description, status } = await request.json();

	if (!transactionId) {
		return json({ error: 'transactionId is required' }, { status: 400 });
	}

	const txId = toObjectId(transactionId);
	if (!txId) {
		return json({ error: 'Invalid transaction ID' }, { status: 400 });
	}

	const transactionsColl = await getHallwayTransactionsCollection();
	const usersColl = await getUsersCollection();

	const transaction = await transactionsColl.findOne({ _id: txId });
	if (!transaction) {
		return json({ error: 'Transaction not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: new Date() };
	let balanceAdjustment = 0;

	// Handle amount change
	if (amount !== undefined && typeof amount === 'number' && amount !== transaction.amount) {
		const oldAmount = transaction.amount;
		const newAmount = amount;
		balanceAdjustment = newAmount - oldAmount; // Difference to apply
		updates.amount = newAmount;
	}

	// Handle description change
	if (description !== undefined && typeof description === 'string') {
		updates.description = description;
	}

	// Handle status change
	if (status !== undefined) {
		const validStatuses = ['unclaimed', 'claimed', 'outstanding', 'paid_pending', 'resolved', 'waived'];
		if (!validStatuses.includes(status)) {
			return json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
		}

		// If changing to/from waived, need to adjust balance
		const wasActive = !['paid_pending', 'waived'].includes(transaction.status);
		const willBeActive = !['paid_pending', 'waived'].includes(status);

		if (wasActive && !willBeActive) {
			// Was affecting balance, now won't - reverse the amount
			balanceAdjustment -= transaction.amount;
		} else if (!wasActive && willBeActive) {
			// Wasn't affecting balance, now will - apply the amount
			balanceAdjustment += updates.amount !== undefined ? (updates.amount as number) : transaction.amount;
		}

		updates.status = status;
	}

	if (Object.keys(updates).length === 1) {
		return json({ error: 'No changes provided' }, { status: 400 });
	}

	await transactionsColl.updateOne({ _id: txId }, { $set: updates });

	// Apply balance adjustment if needed
	if (balanceAdjustment !== 0) {
		await usersColl.updateOne(
			{ _id: transaction.userId },
			{
				$inc: { hallwayBalance: balanceAdjustment },
				$set: { updatedAt: new Date() }
			}
		);
	}

	return json({
		success: true,
		balanceAdjustment
	});
};

/**
 * DELETE - Delete a transaction
 *
 * Body: {
 *   transactionId: string
 * }
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'accountant')) {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const { transactionId } = await request.json();

	if (!transactionId) {
		return json({ error: 'transactionId is required' }, { status: 400 });
	}

	const txId = toObjectId(transactionId);
	if (!txId) {
		return json({ error: 'Invalid transaction ID' }, { status: 400 });
	}

	const transactionsColl = await getHallwayTransactionsCollection();

	const transaction = await transactionsColl.findOne({ _id: txId });
	if (!transaction) {
		return json({ error: 'Transaction not found' }, { status: 404 });
	}

	// Delete the transaction
	await transactionsColl.deleteOne({ _id: txId });

	// Recalculate user's balance to ensure accuracy
	const newBalance = await recalculateUserBalance(transaction.userId);

	return json({
		success: true,
		deletedTransaction: transaction,
		newBalance
	});
};
