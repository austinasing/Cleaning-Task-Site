/**
 * POST /api/subtasks/[id]/feedback
 *
 * Toggles the current user's smile or frown on a completed subtask.
 * One vote per user enforced server-side via $addToSet/$pull on name arrays.
 * Clicking the same emoji again removes the vote; clicking the other switches it.
 *
 * Request body: { type: "smile" | "frown" }
 * Response: { smilesBy: string[], frownsBy: string[] }
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

	const { type } = await request.json();
	if (type !== 'smile' && type !== 'frown') {
		return json({ error: 'type must be "smile" or "frown"' }, { status: 400 });
	}

	const subtasksColl = await getSubtasksCollection();
	const subtask = await subtasksColl.findOne({ _id: subtaskId });

	if (!subtask) {
		return json({ error: 'Subtask not found' }, { status: 404 });
	}

	if (!subtask.completedBy && !subtask.lateCompletedBy) {
		return json({ error: 'Cannot give feedback on an incomplete subtask' }, { status: 400 });
	}

	const userName = locals.user.name;
	const field = type === 'smile' ? 'smilesBy' : 'frownsBy';
	const oppositeField = type === 'smile' ? 'frownsBy' : 'smilesBy';
	const currentArray: string[] = subtask[field] ?? [];
	const alreadyVoted = currentArray.includes(userName);

	let update: object;
	if (alreadyVoted) {
		update = { $pull: { [field]: userName } };
	} else {
		update = {
			$addToSet: { [field]: userName },
			$pull: { [oppositeField]: userName }
		};
	}

	const updated = await subtasksColl.findOneAndUpdate(
		{ _id: subtaskId },
		update,
		{ returnDocument: 'after' }
	);

	return json({
		smilesBy: updated?.smilesBy ?? [],
		frownsBy: updated?.frownsBy ?? []
	});
};
