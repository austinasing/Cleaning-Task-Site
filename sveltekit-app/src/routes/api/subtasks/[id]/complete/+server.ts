/**
 * PATCH /api/subtasks/[id]/complete
 *
 * Marks a subtask as completed (on-time).
 * The [id] in the URL is a dynamic parameter - SvelteKit extracts it
 * from the folder name and makes it available as event.params.id
 *
 * Request body: (none needed - uses logged-in user from session)
 * Response: { subtask: updated subtask }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtasksCollection, toObjectId } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Convert the URL parameter to an ObjectId
	const subtaskId = toObjectId(params.id);
	if (!subtaskId) {
		return json({ error: 'Invalid subtask ID' }, { status: 400 });
	}

	const subtasks = await getSubtasksCollection();

	// Find the subtask first to check if it's already completed
	const subtask = await subtasks.findOne({ _id: subtaskId });
	if (!subtask) {
		return json({ error: 'Subtask not found' }, { status: 404 });
	}

	if (subtask.completedBy) {
		return json({ error: 'Subtask already completed' }, { status: 409 });
	}

	// Mark as completed with the current user's name
	const result = await subtasks.findOneAndUpdate(
		{ _id: subtaskId },
		{
			$set: {
				completedBy: user.name,
				completedAt: new Date(),
				updatedAt: new Date()
			}
		},
		{ returnDocument: 'after' }
	);

	return json({ subtask: result });
};
