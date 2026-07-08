/**
 * GET /api/weeks/active
 *
 * Returns the currently active week.
 * This is the main entry point for the frontend - it loads the active week
 * and then uses the weekId to fetch task groups and subtasks.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWeeksCollection } from '$lib/server/db';
import { advanceWeekStatuses } from '$lib/server/cron';

export const GET: RequestHandler = async () => {
	const weeks = await getWeeksCollection();
	let activeWeek = await weeks.findOne({ status: 'active' });

	// If no active week found, try advancing statuses first (lazy catch-up)
	if (!activeWeek) {
		await advanceWeekStatuses();
		activeWeek = await weeks.findOne({ status: 'active' });
	}

	if (!activeWeek) {
		return json({ error: 'No active week found' }, { status: 404 });
	}

	return json({ week: activeWeek });
};
