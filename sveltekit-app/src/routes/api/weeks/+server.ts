/**
 * GET /api/weeks
 *
 * Returns weeks sorted by year and weekNumber descending (newest first).
 * Used for the week navigation feature to browse history.
 * Future weeks (status: 'future') are hidden from regular users unless ?includeFuture=true (admin only).
 *
 * Query params:
 *   ?limit=10           - Limit number of results (default: 20)
 *   ?includeFuture=true - Include future weeks (admin only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWeeksCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const includeFuture = url.searchParams.get('includeFuture') === 'true';

	// Only admins can see future weeks
	const isAdmin = locals.user?.role === 'admin';
	const showFuture = includeFuture && isAdmin;

	const weeks = await getWeeksCollection();

	// Filter out future weeks for non-admins
	const filter = showFuture ? {} : { status: { $ne: 'future' as const } };

	const allWeeks = await weeks
		.find(filter)
		.sort({ year: -1, weekNumber: -1 })
		.limit(limit)
		.toArray();

	return json({ weeks: allWeeks });
};
