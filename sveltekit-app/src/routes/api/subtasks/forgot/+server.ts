/**
 * POST /api/subtasks/forgot
 *
 * Batch endpoint: user marks multiple subtasks as forgotten.
 * Sets forgotten=true on all selected subtasks.
 * These will appear on the admin page for review (accepted with no fine).
 *
 * Request body: {
 *   subtaskIds: string[]   // Array of subtask ObjectId strings
 * }
 *
 * Response: { subtasksUpdated: number }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtasksCollection, toObjectId } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { subtaskIds } = await request.json();

	if (!Array.isArray(subtaskIds) || subtaskIds.length === 0) {
		return json({ error: 'subtaskIds must be a non-empty array' }, { status: 400 });
	}

	// Convert and validate all IDs
	const objectIds = subtaskIds.map((id: string) => toObjectId(id)).filter(Boolean) as ObjectId[];
	if (objectIds.length !== subtaskIds.length) {
		return json({ error: 'One or more invalid subtask IDs' }, { status: 400 });
	}

	const subtasksColl = await getSubtasksCollection();

	// Batch update: mark all as forgotten
	const result = await subtasksColl.updateMany(
		{ _id: { $in: objectIds }, forgotten: false },
		{
			$set: {
				forgotten: true,
				forgottenBy: user.name,
				updatedAt: new Date()
			}
		}
	);

	return json({ subtasksUpdated: result.modifiedCount });
};
