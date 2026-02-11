/**
 * POST /api/extra-tasks/[id]/complete
 *
 * Admin/accountant confirms a pending extra task is completed.
 * Sets status to "completed" and credits the user's hallway balance.
 *
 * Response: { task, transaction }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getExtraTasksCollection,
	getUsersCollection,
	getHallwayTransactionsCollection,
	toObjectId
} from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (locals.user.role !== 'admin' && locals.user.role !== 'accountant') {
		return json({ error: 'Admin or accountant access required' }, { status: 403 });
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

	if (task.status !== 'pending') {
		return json({ error: 'Task must be in pending status to complete' }, { status: 409 });
	}

	if (!task.completedBy) {
		return json({ error: 'Task has no assigned user' }, { status: 400 });
	}

	// Mark task as completed
	const updatedTask = await tasksColl.findOneAndUpdate(
		{ _id: id },
		{ $set: { status: 'completed' } },
		{ returnDocument: 'after' }
	);

	// Credit the user's balance
	const usersColl = await getUsersCollection();
	const completedUser = await usersColl.findOne({ name: task.completedBy });

	if (completedUser) {
		const transactionsColl = await getHallwayTransactionsCollection();
		const now = new Date();

		const transaction = {
			userId: completedUser._id,
			type: 'payment' as const,
			amount: task.value, // Positive = credit
			description: `Extra task completed: ${task.taskDescription}`,
			relatedSubtaskId: null,
			status: 'outstanding' as const,
			createdAt: now
		};

		await transactionsColl.insertOne(transaction);

		await usersColl.updateOne(
			{ _id: completedUser._id },
			{
				$inc: { hallwayBalance: task.value },
				$set: { updatedAt: now }
			}
		);

		return json({ task: updatedTask, transaction });
	}

	return json({ task: updatedTask });
};
