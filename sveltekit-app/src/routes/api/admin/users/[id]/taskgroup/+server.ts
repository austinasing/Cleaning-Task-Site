/**
 * PATCH /api/admin/users/[id]/taskgroup
 * Reassigns a user to a different task group
 *
 * Request body: { taskGroupId: string }
 * Response: { success: true }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTaskGroupsCollection, toObjectId } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const userId = toObjectId(params.id);
	if (!userId) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const body = await request.json();
	const newTaskGroupId = toObjectId(body.taskGroupId);

	if (!newTaskGroupId) {
		return json({ error: 'Invalid task group ID' }, { status: 400 });
	}

	const taskGroupsColl = await getTaskGroupsCollection();

	// Remove user from all current task groups
	await taskGroupsColl.updateMany(
		{ 'members.userId': userId },
		{
			$pull: { members: { userId } },
			$set: { updatedAt: new Date() }
		}
	);

	// Add user to the new task group
	const targetGroup = await taskGroupsColl.findOne({ _id: newTaskGroupId });

	if (!targetGroup) {
		return json({ error: 'Task group not found' }, { status: 404 });
	}

	// Get user's name (we need it for the members array)
	const { getUsersCollection } = await import('$lib/server/db');
	const usersColl = await getUsersCollection();
	const user = await usersColl.findOne({ _id: userId }, { projection: { name: 1 } });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	await taskGroupsColl.updateOne(
		{ _id: newTaskGroupId },
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
