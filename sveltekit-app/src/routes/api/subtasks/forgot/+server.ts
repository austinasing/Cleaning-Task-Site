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
import { getSubtasksCollection, getUsersCollection, toObjectId } from '$lib/server/db';
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

	// Fetch the subtasks that are not yet forgotten (these are the ones that will change)
	const toUpdate = await subtasksColl
		.find({ _id: { $in: objectIds }, forgotten: false }, { projection: { weekId: 1, taskGroupName: 1 } })
		.toArray();

	// Determine unique (weekId, taskGroupName) pairs being newly forgotten
	const newPairs = new Map<string, { weekId: ObjectId; taskGroupName: string }>();
	for (const s of toUpdate) {
		const key = `${s.weekId.toHexString()}:${s.taskGroupName}`;
		if (!newPairs.has(key)) {
			newPairs.set(key, { weekId: s.weekId, taskGroupName: s.taskGroupName });
		}
	}

	// For each pair, check if this user already has a forgotten subtask for it (prior submits)
	let newForgotCount = 0;
	if (newPairs.size > 0) {
		const userId = toObjectId(user.userId);
		if (userId) {
			for (const { weekId, taskGroupName } of newPairs.values()) {
				const alreadyCounted = await subtasksColl.findOne({
					weekId,
					taskGroupName,
					forgotten: true,
					forgottenBy: user.name
				});
				if (!alreadyCounted) {
					newForgotCount++;
				}
			}
		}
	}

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

	// Increment stats.timesForgot only for genuinely new (week, taskGroup) pairs
	if (newForgotCount > 0) {
		const userId = toObjectId(user.userId);
		if (userId) {
			const usersColl = await getUsersCollection();
			await usersColl.updateOne(
				{ _id: userId },
				{ $inc: { 'stats.timesForgot': newForgotCount }, $set: { updatedAt: new Date() } }
			);
		}
	}

	return json({ subtasksUpdated: result.modifiedCount });
};
