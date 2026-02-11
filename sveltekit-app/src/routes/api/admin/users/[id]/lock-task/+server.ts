/**
 * POST /api/admin/users/[id]/lock-task
 *
 * Override a user's task assignment for a specific task group.
 * Adds them to the task group's static members (overrides team rotation).
 * Preserves their taskTeam value so they can return to rotation later.
 *
 * Edge case: For supplies users (taskTeam = null), this acts as a permanent
 * assignment since they don't have a team to rotate with.
 *
 * Request body: {
 *   taskGroupId: string  // ObjectId of the task group to override to
 * }
 *
 * DELETE /api/admin/users/[id]/lock-task
 *
 * Remove task override.
 * Removes them from all task groups' static members.
 * If user has a taskTeam, they return to rotation.
 * If taskTeam is null, they won't be assigned to any task group.
 *
 * Response: { success: true }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, getTaskGroupsCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const userId = toObjectId(params.id);
	if (!userId) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const body = await request.json();
	const taskGroupId = toObjectId(body.taskGroupId);
	if (!taskGroupId) {
		return json({ error: 'Invalid task group ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const taskGroupsColl = await getTaskGroupsCollection();

	// Get user's name for the members array
	const user = await usersColl.findOne({ _id: userId }, { projection: { name: 1 } });
	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// 1. Remove user from all task groups' members (clear any existing overrides)
	await taskGroupsColl.updateMany(
		{ 'members.userId': userId },
		{
			$pull: { members: { userId } },
			$set: { updatedAt: new Date() }
		}
	);

	// 2. Add user to the selected task group's members (set new override)
	await taskGroupsColl.updateOne(
		{ _id: taskGroupId },
		{
			$push: {
				members: {
					userId: userId,
					name: user.name
				}
			},
			$set: { updatedAt: new Date() }
		}
	);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const userId = toObjectId(params.id);
	if (!userId) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const taskGroupsColl = await getTaskGroupsCollection();

	// Remove user from all task groups' members (remove override)
	// User's taskTeam value is preserved, so they'll return to team rotation if they have one
	await taskGroupsColl.updateMany(
		{ 'members.userId': userId },
		{
			$pull: { members: { userId } },
			$set: { updatedAt: new Date() }
		}
	);

	return json({ success: true });
};
