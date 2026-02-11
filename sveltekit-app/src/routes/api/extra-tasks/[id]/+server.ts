/**
 * PATCH /api/extra-tasks/[id]
 * Claim an extra task (sets status to "pending" and assigns to current user).
 * Only available tasks can be claimed.
 *
 * Response: { task }
 *
 * DELETE /api/extra-tasks/[id]
 * Removes an extra task. Only the creator or admin/accountant can delete.
 *
 * Response: { message: "Task deleted" }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExtraTasksCollection, toObjectId } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid task ID' }, { status: 400 });
	}

	const tasksColl = await getExtraTasksCollection();
	const task = await tasksColl.findOne({ _id: id });

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	if (task.status !== 'available') {
		return json({ error: 'Task is not available for claiming' }, { status: 409 });
	}

	const updatedTask = await tasksColl.findOneAndUpdate(
		{ _id: id, status: 'available' },
		{
			$set: {
				status: 'pending',
				completedBy: locals.user.name
			}
		},
		{ returnDocument: 'after' }
	);

	if (!updatedTask) {
		return json({ error: 'Task was already claimed' }, { status: 409 });
	}

	return json({ task: updatedTask });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid task ID' }, { status: 400 });
	}

	const tasksColl = await getExtraTasksCollection();
	const task = await tasksColl.findOne({ _id: id });

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}

	// Only the creator or admin/accountant can delete
	const isCreator = task.createdBy === locals.user.name;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isCreator && !isPrivileged) {
		return json({ error: 'Only the creator or admin can delete this task' }, { status: 403 });
	}

	await tasksColl.deleteOne({ _id: id });

	return json({ message: 'Task deleted' });
};
