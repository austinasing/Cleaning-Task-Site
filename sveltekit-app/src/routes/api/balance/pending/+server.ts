/**
 * GET /api/balance/pending
 *
 * Returns all transactions with status 'paid_pending' for admin approval.
 * Admin/accountant only.
 *
 * Response: { pendingTransactions: [...] }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getHallwayTransactionsCollection, getUsersCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admin and accountant can view pending
	if (user.role !== 'admin' && user.role !== 'accountant') {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
	}

	const transactionsColl = await getHallwayTransactionsCollection();
	const usersColl = await getUsersCollection();

	// Get all pending transactions
	const pendingTransactions = await transactionsColl
		.find({ status: 'paid_pending' })
		.sort({ createdAt: -1 })
		.toArray();

	// Get all users for name lookup
	const users = await usersColl.find({}, { projection: { name: 1 } }).toArray();
	const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

	// Enrich with user names
	const enriched = pendingTransactions.map((tx) => ({
		...tx,
		userName: userMap.get(tx.userId.toString()) || 'Unknown'
	}));

	return json({
		pendingTransactions: enriched
	});
};
