/**
 * POST /api/subtasks/late
 *
 * Batch endpoint: user marks multiple subtasks as completed late.
 * User "claims" the fine by submitting - this is the normal flow.
 *
 * Creates ONE fine per task group (not per subtask), subject to:
 * - 15€ max cap per user per WEEK across all task groups
 * - Fine = min(daysLate × 5€, 15€ - existingFinesThisWeek)
 *
 * Request body: {
 *   subtaskIds: string[],   // Array of subtask ObjectId strings
 *   daysLate: number        // Days late for the overall task (1-3)
 * }
 *
 * Response: { subtasksUpdated, fineAmount, groupsFined, cappedAt }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getSubtasksCollection,
	getHallwayTransactionsCollection,
	getTaskGroupsCollection,
	getUsersCollection,
	getUserFinesForWeek,
	toObjectId
} from '$lib/server/db';
import { ObjectId } from 'mongodb';

const FINE_PER_DAY = 5;
const MAX_FINE_PER_WEEK = 15;

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { subtaskIds, daysLate } = await request.json();

	if (!Array.isArray(subtaskIds) || subtaskIds.length === 0) {
		return json({ error: 'subtaskIds must be a non-empty array' }, { status: 400 });
	}

	if (!daysLate || daysLate < 1 || daysLate > 3) {
		return json({ error: 'daysLate must be between 1 and 3' }, { status: 400 });
	}

	// Convert and validate all IDs
	const objectIds = subtaskIds.map((id: string) => toObjectId(id)).filter(Boolean) as ObjectId[];
	if (objectIds.length !== subtaskIds.length) {
		return json({ error: 'One or more invalid subtask IDs' }, { status: 400 });
	}

	const subtasksColl = await getSubtasksCollection();
	const transactionsColl = await getHallwayTransactionsCollection();
	const taskGroupsColl = await getTaskGroupsCollection();
	const usersColl = await getUsersCollection();

	// Fetch all selected subtasks
	const subtasks = await subtasksColl
		.find({ _id: { $in: objectIds }, lateCompletedBy: null })
		.toArray();

	if (subtasks.length === 0) {
		return json({ error: 'No unresolved subtasks found' }, { status: 404 });
	}

	// Get the weekId from the first subtask (all should be same week)
	const weekId = subtasks[0].weekId;

	// Group subtasks by task group (in case they span multiple groups)
	const byGroup = new Map<string, ObjectId[]>();
	for (const subtask of subtasks) {
		const existing = byGroup.get(subtask.taskGroupName) || [];
		existing.push(subtask._id);
		byGroup.set(subtask.taskGroupName, existing);
	}

	// Get display names for task groups
	const taskGroups = await taskGroupsColl.find().toArray();
	const groupMap = new Map(taskGroups.map((g) => [g.name, g.displayName]));

	const now = new Date();
	const userId = toObjectId(user.userId)!;

	// Check existing fines for this user this week (for 15€ cap)
	const existingFines = await getUserFinesForWeek(userId, weekId);
	const remainingCap = MAX_FINE_PER_WEEK - existingFines;

	// If already at cap, no additional fine
	if (remainingCap <= 0) {
		// Still mark subtasks as completed, but no fine
		await subtasksColl.updateMany(
			{ _id: { $in: objectIds }, lateCompletedBy: null },
			{
				$set: {
					lateCompletedBy: user.name,
					lateCompletedAt: now,
					daysLate,
					updatedAt: now
				}
			}
		);

		return json({
			subtasksUpdated: subtasks.length,
			fineAmount: 0,
			groupsFined: [],
			cappedAt: MAX_FINE_PER_WEEK,
			message: 'Weekly fine cap already reached - no additional fine applied'
		});
	}

	// Calculate fine (capped by remaining allowance)
	const rawFine = daysLate * FINE_PER_DAY;
	const actualFine = Math.min(rawFine, remainingCap);
	const fineAmount = -actualFine; // Negative for charges

	// Mark ALL selected subtasks as late completed (batch update)
	await subtasksColl.updateMany(
		{ _id: { $in: objectIds }, lateCompletedBy: null },
		{
			$set: {
				lateCompletedBy: user.name,
				lateCompletedAt: now,
				daysLate,
				updatedAt: now
			}
		}
	);

	// Create ONE transaction total (not per task group) since cap is per week
	// We track the first task group for reference
	const firstGroupName = Array.from(byGroup.keys())[0];
	const groupNames = Array.from(byGroup.keys())
		.map((name) => groupMap.get(name) || name)
		.join(', ');

	const description =
		byGroup.size === 1
			? `Late task: ${groupNames} (${daysLate} day${daysLate > 1 ? 's' : ''} late)`
			: `Late tasks: ${groupNames} (${daysLate} day${daysLate > 1 ? 's' : ''} late)`;

	const transaction = {
		userId,
		type: 'task_fine' as const,
		amount: fineAmount,
		description,
		weekId,
		taskGroupName: firstGroupName,
		relatedSubtaskId: null,
		status: 'outstanding' as const,
		claimGroupId: null,
		pairedUserId: null,
		approvedByUserId: null,
		approvedAt: null,
		createdAt: now,
		updatedAt: now
	};

	await transactionsColl.insertOne(transaction);

	// Update user's hallway balance
	await usersColl.updateOne(
		{ _id: userId },
		{
			$inc: { hallwayBalance: fineAmount },
			$set: { updatedAt: now }
		}
	);

	return json({
		subtasksUpdated: subtasks.length,
		fineAmount: actualFine,
		groupsFined: Array.from(byGroup.keys()).map((name) => groupMap.get(name) || name),
		cappedAt: rawFine > actualFine ? MAX_FINE_PER_WEEK : null
	});
};
