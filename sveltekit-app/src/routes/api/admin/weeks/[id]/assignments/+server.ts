/**
 * PATCH /api/admin/weeks/[id]/assignments
 *
 * Set manual assignment overrides for a specific week.
 * Allows admin to manually assign users to task groups for this week only,
 * without changing their permanent team assignments.
 *
 * Request body: {
 *   taskGroupName: string,
 *   userIds: string[]  // Array of user IDs to assign (empty array = remove override)
 * }
 *
 * Response: { success: true }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWeeksCollection, toObjectId } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Admin only
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const weekId = toObjectId(params.id);
	if (!weekId) {
		return json({ error: 'Invalid week ID' }, { status: 400 });
	}

	const body = await request.json();
	const { taskGroupName, userIds } = body;

	if (!taskGroupName || typeof taskGroupName !== 'string') {
		return json({ error: 'taskGroupName is required' }, { status: 400 });
	}

	if (!Array.isArray(userIds)) {
		return json({ error: 'userIds must be an array' }, { status: 400 });
	}

	const weeksColl = await getWeeksCollection();

	// If userIds is empty, remove the override; otherwise set it
	const update =
		userIds.length === 0
			? { $unset: { [`assignmentOverrides.${taskGroupName}`]: '' } }
			: { $set: { [`assignmentOverrides.${taskGroupName}`]: userIds } };

	const result = await weeksColl.findOneAndUpdate(
		{ _id: weekId },
		update,
		{ returnDocument: 'after' }
	);

	if (!result) {
		return json({ error: 'Week not found' }, { status: 404 });
	}

	return json({ success: true, week: result });
};
