/**
 * GET /api/taskgroups
 *
 * Returns raw task groups with only their static members (overrides).
 * Does NOT compute dynamic rotation-based members.
 * Used for admin UI to manage overrides.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTaskGroupsCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const taskGroupsColl = await getTaskGroupsCollection();
	const taskGroups = await taskGroupsColl.find({}).sort({ order: 1 }).toArray();

	return json({
		taskGroups: taskGroups.map((g) => ({
			_id: g._id!.toString(),
			name: g.name,
			displayName: g.displayName,
			members: g.members || []
		}))
	});
};
