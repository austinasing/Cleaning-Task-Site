/**
 * GET /api/admin/forgot
 * Returns all subtasks marked as forgotten (for admin review page)
 *
 * PATCH /api/admin/forgot
 * Admin accepts forgotten subtasks as done (no fine applied)
 * Supports both single and batch resolution.
 *
 * Request body: { subtaskId: string } OR { subtaskIds: string[] }
 * Response: { subtask } OR { subtasksUpdated: number }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtasksCollection, getTaskGroupsCollection, toObjectId } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'accountant')) {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const subtasks = await getSubtasksCollection();

	// Find all forgotten subtasks that haven't been resolved yet
	// (forgotten=true and lateCompletedBy is still null means unresolved)
	const forgottenSubtasks = await subtasks
		.find({ forgotten: true, lateCompletedBy: null })
		.toArray();

	// Enrich with task group display names
	const taskGroupsColl = await getTaskGroupsCollection();
	const taskGroups = await taskGroupsColl.find().toArray();
	const groupMap = new Map(taskGroups.map((g) => [g.name, g.displayName]));

	const enriched = forgottenSubtasks.map((s) => ({
		...s,
		taskGroupDisplayName: groupMap.get(s.taskGroupName) || s.taskGroupName
	}));

	return json({ forgottenSubtasks: enriched });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'accountant')) {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const body = await request.json();
	const { subtaskId, subtaskIds } = body;

	const subtasksColl = await getSubtasksCollection();
	const now = new Date();
	const resolvedBy = `Accepted by ${locals.user.name}`;

	// Handle batch resolution
	if (Array.isArray(subtaskIds) && subtaskIds.length > 0) {
		const objectIds = subtaskIds
			.map((id: string) => toObjectId(id))
			.filter(Boolean) as ObjectId[];

		if (objectIds.length !== subtaskIds.length) {
			return json({ error: 'One or more invalid subtask IDs' }, { status: 400 });
		}

		const result = await subtasksColl.updateMany(
			{ _id: { $in: objectIds }, forgotten: true, lateCompletedBy: null },
			{
				$set: {
					lateCompletedBy: resolvedBy,
					lateCompletedAt: now,
					daysLate: 0,
					updatedAt: now
				}
			}
		);

		return json({ subtasksUpdated: result.modifiedCount });
	}

	// Handle single subtask resolution (backwards compatible)
	const id = toObjectId(subtaskId);
	if (!id) {
		return json({ error: 'Invalid subtask ID' }, { status: 400 });
	}

	const subtask = await subtasksColl.findOne({ _id: id });

	if (!subtask) {
		return json({ error: 'Subtask not found' }, { status: 404 });
	}

	if (!subtask.forgotten) {
		return json({ error: 'Subtask is not marked as forgotten' }, { status: 400 });
	}

	// Admin accepts - mark as resolved with no fine
	const updatedSubtask = await subtasksColl.findOneAndUpdate(
		{ _id: id },
		{
			$set: {
				lateCompletedBy: resolvedBy,
				lateCompletedAt: now,
				daysLate: 0,
				updatedAt: now
			}
		},
		{ returnDocument: 'after' }
	);

	return json({ subtask: updatedSubtask });
};
