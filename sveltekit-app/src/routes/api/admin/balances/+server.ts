/**
 * GET /api/admin/balances
 *
 * Returns all active users' hallway balances and recent transactions.
 * Visible to ALL logged-in users (the hallway balance page is shared).
 *
 * Query params:
 *   ?offset=0      Skip this many transactions (for pagination)
 *   ?limit=20      Number of transactions to return (default 20)
 *   ?userId=xxx    Filter transactions to specific user only
 *
 * Response: {
 *   balances: [{ _id, name, emoji, hallwayBalance }],
 *   transactions: [...],     // Most recent first, paginated
 *   totalTransactions: number, // Total count for pagination
 *   currentUserBalance?: number, // Current user's balance
 *   unclaimedFines?: [...] // Current user's unclaimed fines (claimable)
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, getHallwayTransactionsCollection, toObjectId } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
	const filterUserId = url.searchParams.get('userId');

	const usersColl = await getUsersCollection();
	const transactionsColl = await getHallwayTransactionsCollection();

	// Get all active users' balances
	const users = await usersColl
		.find(
			{ active: true },
			{ projection: { name: 1, emoji: 1, hallwayBalance: 1 } }
		)
		.sort({ hallwayBalance: 1 }) // Most negative first
		.toArray();

	// Build a userId → name map for enriching transactions
	const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

	// Build transaction query - optionally filter by user
	const txQuery: Record<string, unknown> = {};
	if (filterUserId) {
		const filterObjId = toObjectId(filterUserId);
		if (filterObjId) {
			txQuery.userId = filterObjId;
		}
	}

	// Get paginated transactions
	const [transactions, totalTransactions] = await Promise.all([
		transactionsColl
			.find(txQuery)
			.sort({ createdAt: -1 })
			.skip(offset)
			.limit(limit)
			.toArray(),
		transactionsColl.countDocuments(txQuery)
	]);

	// Enrich transactions with user names
	const enrichedTransactions = transactions.map((t) => ({
		...t,
		userName: userMap.get(t.userId.toString()) || 'Unknown'
	}));

	// Get current user's balance and unclaimed fines
	const currentUserId = toObjectId(locals.user.userId);
	const currentUser = users.find((u) => u._id.equals(currentUserId!));

	// Find unclaimed fines for current user (these are claimable)
	const unclaimedFines = await transactionsColl
		.find({
			userId: currentUserId,
			status: 'unclaimed'
		})
		.toArray();

	// Enrich unclaimed fines with paired user info
	const enrichedUnclaimedFines = await Promise.all(
		unclaimedFines.map(async (fine) => {
			let pairedUserName = 'Unknown';
			if (fine.pairedUserId) {
				pairedUserName = userMap.get(fine.pairedUserId.toString()) || 'Unknown';
			}
			return {
				...fine,
				pairedUserName
			};
		})
	);

	return json({
		balances: users,
		transactions: enrichedTransactions,
		totalTransactions,
		currentUserBalance: currentUser?.hallwayBalance ?? 0,
		unclaimedFines: enrichedUnclaimedFines
	});
};
