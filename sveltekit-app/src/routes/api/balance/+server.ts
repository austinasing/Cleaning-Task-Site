/**
 * GET /api/balance
 *
 * Returns the current user's hallway balance and transaction history.
 * Balance is stored on the user document (hallwayBalance field).
 * Transactions are the detailed log of how that balance was reached.
 *
 * Optional query params:
 *   ?userId=xxx   Admin/accountant can view another user's balance
 *
 * Response: {
 *   balance: number,         // Current balance in EUR (negative = owes money)
 *   transactions: [...]      // Sorted newest first
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUsersCollection,
	getHallwayTransactionsCollection,
	toObjectId
} from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Determine which user's balance to fetch
	const requestedUserId = url.searchParams.get('userId');
	let targetUserId: string;

	if (requestedUserId) {
		// Only admin/accountant can view other users' balances
		if (user.role !== 'admin' && user.role !== 'accountant') {
			return json({ error: 'Only admin/accountant can view other balances' }, { status: 403 });
		}
		targetUserId = requestedUserId;
	} else {
		targetUserId = user.userId;
	}

	const id = toObjectId(targetUserId);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const transactionsColl = await getHallwayTransactionsCollection();

	// Get user's current balance
	const targetUser = await usersColl.findOne(
		{ _id: id },
		{ projection: { name: 1, hallwayBalance: 1 } }
	);

	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Get all transactions for this user, newest first
	const transactions = await transactionsColl
		.find({ userId: id })
		.sort({ createdAt: -1 })
		.toArray();

	return json({
		userName: targetUser.name,
		balance: targetUser.hallwayBalance,
		transactions
	});
};
