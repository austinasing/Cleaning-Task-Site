/**
 * POST /api/balance/mark-paid
 *
 * User marks their own outstanding fine as paid.
 * This moves the transaction to 'paid_pending' status awaiting admin approval.
 * The balance remains affected until admin approves (then status → 'resolved').
 *
 * Request body: {
 *   transactionId: string   // The transaction to mark as paid
 * }
 *
 * Response: { success, status }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getHallwayTransactionsCollection, getUsersCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
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

	// Find the transaction
	const transaction = await transactionsColl.findOne({ _id: txId });

	if (!transaction) {
		return json({ error: 'Transaction not found' }, { status: 404 });
	}

	// Must belong to the current user
	const userId = toObjectId(user.userId)!;
	if (!transaction.userId.equals(userId)) {
		return json({ error: 'This transaction does not belong to you' }, { status: 403 });
	}

	// Must be an outstanding or claimed fine (not already pending/resolved/waived)
	if (transaction.status !== 'outstanding' && transaction.status !== 'claimed') {
		return json(
			{
				error: `Cannot mark as paid: transaction is ${transaction.status}`
			},
			{ status: 400 }
		);
	}

	// Must be a fine (negative amount)
	if (transaction.amount >= 0) {
		return json({ error: 'Only fines can be marked as paid' }, { status: 400 });
	}

	const now = new Date();

	const usersColl = await getUsersCollection();

	// Update status to paid_pending and immediately credit the balance
	// (the credit is reversed if the admin rejects)
	await transactionsColl.updateOne(
		{ _id: txId },
		{
			$set: {
				status: 'paid_pending',
				updatedAt: now
			}
		}
	);

	await usersColl.updateOne(
		{ _id: transaction.userId },
		{
			$inc: { hallwayBalance: -transaction.amount }, // amount is negative, so this adds a positive credit
			$set: { updatedAt: now }
		}
	);

	return json({
		success: true,
		status: 'paid_pending',
		message: 'Marked as paid - awaiting admin approval'
	});
};
