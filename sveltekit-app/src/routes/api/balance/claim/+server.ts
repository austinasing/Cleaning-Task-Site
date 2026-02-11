/**
 * POST /api/balance/claim
 *
 * User claims responsibility for an unclaimed paired fine.
 * When neither team member participated and both got unclaimed fines,
 * either person can claim to take full responsibility.
 *
 * This removes the OTHER person's fine (waives it) and credits their balance.
 *
 * Request body: {
 *   transactionId: string   // The unclaimed fine to claim
 * }
 *
 * Response: { success, claimedAmount, waivedForUser }
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

	const { transactionId } = await request.json();

	if (!transactionId) {
		return json({ error: 'transactionId is required' }, { status: 400 });
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

	// Must be an unclaimed fine
	if (transaction.status !== 'unclaimed') {
		return json({ error: 'Transaction is not unclaimed' }, { status: 400 });
	}

	// Must have a paired transaction (claimGroupId)
	if (!transaction.claimGroupId) {
		return json({ error: 'Transaction has no paired fine to claim' }, { status: 400 });
	}

	// User must be one of the two people involved
	const userId = toObjectId(user.userId)!;
	const isOwner = transaction.userId.equals(userId);
	const isPaired = transaction.pairedUserId?.equals(userId);

	if (!isOwner && !isPaired) {
		return json({ error: 'You are not involved in this fine' }, { status: 403 });
	}

	// Find the paired transaction
	const pairedTransaction = await transactionsColl.findOne({
		claimGroupId: transaction.claimGroupId,
		_id: { $ne: txId }
	});

	if (!pairedTransaction) {
		return json({ error: 'Paired transaction not found' }, { status: 404 });
	}

	const now = new Date();

	// Determine which transaction belongs to the claimer
	// The claimer takes responsibility - their fine stays, other is waived
	let claimerTx, otherTx;
	if (isOwner) {
		// Current user owns this transaction - they're claiming it
		claimerTx = transaction;
		otherTx = pairedTransaction;
	} else {
		// Current user is the paired user - they're claiming the other one
		claimerTx = pairedTransaction;
		otherTx = transaction;
	}

	// Update claimer's transaction: status → 'outstanding' (claimed by submitting)
	await transactionsColl.updateOne(
		{ _id: claimerTx._id },
		{
			$set: {
				status: 'outstanding',
				updatedAt: now
			}
		}
	);

	// Update other person's transaction: status → 'waived'
	await transactionsColl.updateOne(
		{ _id: otherTx._id },
		{
			$set: {
				status: 'waived',
				updatedAt: now
			}
		}
	);

	// Credit the other person's balance (reverse their fine)
	const creditAmount = Math.abs(otherTx.amount); // amount is negative, make positive
	await usersColl.updateOne(
		{ _id: otherTx.userId },
		{
			$inc: { hallwayBalance: creditAmount },
			$set: { updatedAt: now }
		}
	);

	// Get other user's name for response
	const otherUser = await usersColl.findOne(
		{ _id: otherTx.userId },
		{ projection: { name: 1 } }
	);

	return json({
		success: true,
		claimedAmount: Math.abs(claimerTx.amount),
		waivedForUser: otherUser?.name || 'Unknown'
	});
};
