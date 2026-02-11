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

export const GET: RequestHandler = async () => {
	const weeks = await getWeeksCollection();
	const activeWeek = await weeks.findOne({ status: 'active' });

	if (!activeWeek) {
		return json({ error: 'No active week found' }, { status: 404 });
	}

	return json({ week: activeWeek });
};
