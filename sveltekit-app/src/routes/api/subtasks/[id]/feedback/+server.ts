/**
 * POST /api/subtasks/[id]/feedback
 *
 * Any logged-in user can give feedback on a completed subtask.
 * Frontend handles preventing duplicate votes (session-based).
 * Server just increments/decrements the count.
 *
 * The subtask must have been completed (completedBy OR lateCompletedBy)
 * for feedback to be accepted.
 *
 * Request body: {
 *   type: "smile" | "frown",
 *   action: "add" | "remove"  // default: "add"
 * }
 *
 * Response: {
 *   smiles: number,
 *   frowns: number
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtasksCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const subtaskId = toObjectId(params.id);
	if (!subtaskId) {
		return json({ error: 'Invalid subtask ID' }, { status: 400 });
	}

	const { type, action = 'add' } = await request.json();

	if (type !== 'smile' && type !== 'frown') {
		return json({ error: 'type must be "smile" or "frown"' }, { status: 400 });
	}

	if (action !== 'add' && action !== 'remove') {
		return json({ error: 'action must be "add" or "remove"' }, { status: 400 });
	}

	const subtasksColl = await getSubtasksCollection();
	const subtask = await subtasksColl.findOne({ _id: subtaskId });

	if (!subtask) {
		return json({ error: 'Subtask not found' }, { status: 404 });
	}

	// Allow feedback on tasks completed on-time OR late
	if (!subtask.completedBy && !subtask.lateCompletedBy) {
		return json({ error: 'Cannot give feedback on an incomplete subtask' }, { status: 400 });
	}

	// Simple increment/decrement
	const increment = action === 'add' ? 1 : -1;
	const field = type === 'smile' ? 'smiles' : 'frowns';

	const updated = await subtasksColl.findOneAndUpdate(
		{ _id: subtaskId },
		{ $inc: { [field]: increment } },
		{ returnDocument: 'after' }
	);

	return json({
		smiles: updated?.smiles ?? subtask.smiles,
		frowns: updated?.frowns ?? subtask.frowns
	});
};
