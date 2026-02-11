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

		// For payment requests, credit the user's balance
		// For marked-as-paid fines, the balance was already affected - now just resolve
		let balanceChange = 0;

		if (transaction.type === 'payment_request') {
			// Credit the user's balance with the payment amount
			balanceChange = transaction.amount;
			await usersColl.updateOne(
				{ _id: transaction.userId },
				{
					$inc: { hallwayBalance: transaction.amount },
					$set: { updatedAt: now }
				}
			);
		}
		// For task_fine that was marked paid, the negative amount was already
		// applied when the fine was created. Approving just confirms payment.
		// No balance change needed.

		return json({
			success: true,
			newStatus: 'resolved',
			balanceChange
		});
	} else {
		// Reject - waive the transaction
		await transactionsColl.updateOne(
			{ _id: txId },
			{
				$set: {
					status: 'waived',
					approvedByUserId: approverUserId,
					approvedAt: now,
					updatedAt: now
				}
			}
		);

		// For payment requests that are rejected, nothing was applied to balance anyway
		// For marked-as-paid fines that are rejected, the fine stays in effect
		// (balance was already affected, rejecting means "not actually paid")

		return json({
			success: true,
			newStatus: 'waived',
			message: 'Transaction rejected'
		});
	}
};
