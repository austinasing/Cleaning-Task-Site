/**
 * POST /api/balance/request-payment
 *
 * User submits a payment request for admin approval.
 * Creates a transaction with status 'paid_pending' and type 'payment_request'.
 * Does NOT affect balance until admin approves.
 *
 * Request body: {
 *   amount: number   // Positive amount user claims to have paid
 * }
 *
 * Response: { success, transactionId }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getHallwayTransactionsCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { amount } = await request.json();

	if (typeof amount !== 'number' || amount <= 0) {
		return json({ error: 'amount must be a positive number' }, { status: 400 });
	}

	// Cap at reasonable maximum to prevent mistakes
	if (amount > 500) {
		return json({ error: 'Amount cannot exceed 500' }, { status: 400 });
	}

	const transactionsColl = await getHallwayTransactionsCollection();
	const userId = toObjectId(user.userId)!;
	const now = new Date();

	// Create payment request transaction
	const transaction = {
		userId,
		type: 'payment_request' as const,
		amount, // Positive - will be added to balance when approved
		description: `Payment request: €${amount.toFixed(2)}`,
		weekId: null,
		taskGroupName: null,
		relatedSubtaskId: null,
		status: 'paid_pending' as const, // Awaiting approval
		claimGroupId: null,
		pairedUserId: null,
		approvedByUserId: null,
		approvedAt: null,
		createdAt: now,
		updatedAt: now
	};

	const result = await transactionsColl.insertOne(transaction);

	return json({
		success: true,
		transactionId: result.insertedId.toString(),
		message: 'Payment request submitted - awaiting admin approval'
	});
};
