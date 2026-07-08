/**
 * POST /api/balance/approve
 *
 * Admin/accountant approves or rejects a pending payment/fine.
 * - Approve: status → 'resolved', applies amount to user's balance
 * - Reject: status → 'waived', no balance change
 *
 * Request body: {
 *   transactionId: string,
 *   action: 'approve' | 'reject'
 * }
 *
 * Response: { success, newStatus, balanceChange? }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getHallwayTransactionsCollection,
	getUsersCollection,
	toObjectId
} from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admin and accountant can approve
	if (user.role !== 'admin' && user.role !== 'accountant') {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const { transactionId, action } = await request.json();

	if (!transactionId) {
		return json({ error: 'transactionId is required' }, { status: 400 });
	}

	if (action !== 'approve' && action !== 'reject') {
		return json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
	}

	const txId = toObjectId(transactionId);
	if (!txId) {
		return json({ error: 'Invalid transaction ID' }, { status: 400 });
	}

	const transactionsColl = await getHallwayTransactionsCollection();
	const usersColl = await getUsersCollection();

	// Find the transaction
	const transaction = await transactionsColl.findOne({ _id: txId });

	if (!transaction) {
		return json({ error: 'Transaction not found' }, { status: 404 });
	}

	// Must be in paid_pending status
	if (transaction.status !== 'paid_pending') {
		return json(
			{
				error: `Transaction is ${transaction.status}, not pending approval`
			},
			{ status: 400 }
		);
	}

	const now = new Date();
	const approverUserId = toObjectId(user.userId)!;

	if (action === 'approve') {
		// Update transaction to resolved
		await transactionsColl.updateOne(
			{ _id: txId },
			{
				$set: {
					status: 'resolved',
					approvedByUserId: approverUserId,
					approvedAt: now,
					updatedAt: now
				}
			}
		);

		let balanceChange = 0;

		if (transaction.type === 'payment_request') {
			// Balance was already credited at submission time, just confirm
			balanceChange = transaction.amount;
		} else {
			// Fine payment: balance was already credited when user marked as paid.
			// Just record the fine_payment audit transaction.
			balanceChange = -transaction.amount; // positive credit (already applied)
			await transactionsColl.insertOne({
				userId: transaction.userId,
				type: 'fine_payment',
				amount: -transaction.amount,
				description: `Fine payment: ${transaction.description}`,
				weekId: transaction.weekId,
				taskGroupName: transaction.taskGroupName,
				relatedSubtaskId: transaction.relatedSubtaskId,
				status: 'resolved',
				claimGroupId: null,
				pairedUserId: null,
				approvedByUserId: approverUserId,
				approvedAt: now,
				createdAt: now,
				updatedAt: now
			});
		}

		return json({
			success: true,
			newStatus: 'resolved',
			balanceChange
		});
	} else {
		// Reject:
		// - payment_request: mark as 'rejected' and reverse the balance credit
		// - task_fine (marked-paid): revert to 'outstanding' so the fine re-applies to balance
		const isPaymentRequest = transaction.type === 'payment_request';
		const rejectedStatus = isPaymentRequest ? 'rejected' : 'outstanding';

		await transactionsColl.updateOne(
			{ _id: txId },
			{
				$set: {
					status: rejectedStatus,
					approvedByUserId: approverUserId,
					approvedAt: now,
					updatedAt: now
				}
			}
		);

		if (isPaymentRequest) {
			// Reverse the credit that was applied at submission time
			await usersColl.updateOne(
				{ _id: transaction.userId },
				{
					$inc: { hallwayBalance: -transaction.amount },
					$set: { updatedAt: now }
				}
			);
		} else {
			// Reverse the early credit applied when user marked the fine as paid
			await usersColl.updateOne(
				{ _id: transaction.userId },
				{
					$inc: { hallwayBalance: transaction.amount }, // amount is negative, re-applies the fine
					$set: { updatedAt: now }
				}
			);
		}

		return json({
			success: true,
			newStatus: rejectedStatus,
			message: isPaymentRequest ? 'Payment rejected — balance reversed' : 'Payment rejected — fine remains outstanding'
		});
	}
};
