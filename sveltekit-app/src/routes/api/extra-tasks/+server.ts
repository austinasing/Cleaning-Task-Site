/**
 * GET /api/extra-tasks
 * Returns all extra tasks, sorted by status (available first) then by date.
 *
 * POST /api/extra-tasks
 * Creates a new extra task.
 *
 * Request body: {
 *   taskDescription: string,
 *   value: number           // EUR value of the task
 * }
 *
 * Response: { task }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExtraTasksCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const tasksColl = await getExtraTasksCollection();

	const tasks = await tasksColl.find().sort({ createdAt: -1 }).toArray();

	// Sort: available first, then pending, then completed
	const statusOrder = { available: 0, pending: 1, completed: 2 };
	tasks.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

	return json({ tasks });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { taskDescription, value } = await request.json();

	if (!taskDescription || typeof taskDescription !== 'string' || taskDescription.trim().length === 0) {
		return json({ error: 'taskDescription is required' }, { status: 400 });
	}

	if (typeof value !== 'number' || value <= 0) {
		return json({ error: 'value must be a positive number' }, { status: 400 });
	}

	const tasksColl = await getExtraTasksCollection();

	const newTask = {
		taskDescription: taskDescription.trim(),
		value,
		createdBy: locals.user.name,
		completedBy: null,
		status: 'available' as const,
		createdAt: new Date()
	};

	const result = await tasksColl.insertOne(newTask);

	return json({ task: { _id: result.insertedId, ...newTask } });
};
