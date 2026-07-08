/**
 * POST /api/admin/subtasks/[id]/reset
 * Resets a single subtask back to incomplete state
 * Any authenticated user can reset subtasks - no blockout restrictions
 *
 * Response: { subtask }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtasksCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const subtaskId = toObjectId(params.id);
	if (!subtaskId) {
		return json({ error: 'Invalid subtask ID' }, { status: 400 });
	}

	const subtasksColl = await getSubtasksCollection();
	const now = new Date();

	const result = await subtasksColl.findOneAndUpdate(
		{ _id: subtaskId },
		{
			$set: {
				completedBy: null,
				completedAt: null,
				lateCompletedBy: null,
				lateCompletedAt: null,
				daysLate: 0,
				forgotten: false,
				forgottenBy: null,
				smilesBy: [],
				frownsBy: [],
				updatedAt: now
			}
		},
		{ returnDocument: 'after' }
	);

	if (!result) {
		return json({ error: 'Subtask not found' }, { status: 404 });
	}

	return json({ subtask: result });
};
