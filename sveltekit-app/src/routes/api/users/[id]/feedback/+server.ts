/**
 * GET /api/users/[id]/feedback
 *
 * Returns aggregated feedback for a user's completed subtasks.
 * Queries all subtasks where completedBy matches the user's name,
 * then sums up the smiles and frowns received.
 *
 * Also returns the individual subtasks that received feedback,
 * so the profile page can show which tasks got reactions.
 *
 * Response: {
 *   totalSmiles: number,
 *   totalFrowns: number,
 *   subtasksWithFeedback: [{ subtaskName, taskGroupName, smiles, frowns, weekId }]
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, getSubtasksCollection, toObjectId } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const isOwnProfile = locals.user.userId === params.id;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isOwnProfile && !isPrivileged) {
		return json({ error: 'You can only view your own feedback' }, { status: 403 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const user = await usersColl.findOne({ _id: id }, { projection: { name: 1 } });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const subtasksColl = await getSubtasksCollection();

	// Find all subtasks completed by this user that have any feedback
	const subtasksWithFeedback = await subtasksColl
		.find(
			{
				completedBy: user.name,
				$or: [
					{ 'smilesBy.0': { $exists: true } },
					{ 'frownsBy.0': { $exists: true } }
				]
			},
			{
				projection: {
					subtaskName: 1,
					taskGroupName: 1,
					smilesBy: 1,
					frownsBy: 1,
					weekId: 1
				}
			}
		)
		.sort({ updatedAt: -1 })
		.toArray();

	// Sum totals
	let totalSmiles = 0;
	let totalFrowns = 0;
	for (const s of subtasksWithFeedback) {
		totalSmiles += s.smilesBy?.length ?? 0;
		totalFrowns += s.frownsBy?.length ?? 0;
	}

	return json({
		totalSmiles,
		totalFrowns,
		subtasksWithFeedback
	});
};
