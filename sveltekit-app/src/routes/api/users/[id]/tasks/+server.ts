/**
 * GET /api/users/[id]/tasks
 * Returns completed tasks for a user, grouped by week.
 *
 * Optional query params:
 *   ?limit=N  - Number of weeks to return (default: 5)
 *
 * Response: {
 *   stats: {
 *     totalCompleted: number,
 *     weeksLate: number  // Number of weeks with at least one late task
 *   },
 *   weeklyTasks: [
 *     {
 *       weekId: string,
 *       weekNumber: number,
 *       year: number,
 *       startDate: Date,
 *       endDate: Date,
 *       totalSmiles: number,
 *       totalFrowns: number,
 *       completedSubtasks: [
 *         {
 *           _id: string,
 *           subtaskName: string,
 *           taskGroupName: string,
 *           completedAt: Date,
 *           lateCompletedAt: Date | null,
 *           daysLate: number,
 *           smiles: number,
 *           frowns: number
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUsersCollection,
	getSubtasksCollection,
	getWeeksCollection,
	toObjectId
} from '$lib/server/db';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = toObjectId(params.id);
	if (!userId) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	// Check permissions
	const isOwnProfile = locals.user.userId === params.id;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isOwnProfile && !isPrivileged) {
		return json({ error: 'You can only view your own task history' }, { status: 403 });
	}

	const usersColl = await getUsersCollection();
	const user = await usersColl.findOne({ _id: userId }, { projection: { name: 1 } });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '5');
	const subtasksColl = await getSubtasksCollection();
	const weeksColl = await getWeeksCollection();

	// Find all subtasks completed, late, or forgotten by this user
	const completedSubtasks = await subtasksColl
		.find({
			$or: [
				{ completedBy: user.name },
				{ lateCompletedBy: user.name },
				{ forgottenBy: user.name }
			]
		})
		.sort({ completedAt: -1, lateCompletedAt: -1 })
		.toArray();

	// Group by week first (needed for stats calculation)
	const tasksByWeekId = new Map<string, typeof completedSubtasks>();
	for (const subtask of completedSubtasks) {
		const weekIdStr = subtask.weekId.toString();
		if (!tasksByWeekId.has(weekIdStr)) {
			tasksByWeekId.set(weekIdStr, []);
		}
		tasksByWeekId.get(weekIdStr)!.push(subtask);
	}

	// Calculate stats
	const totalCompleted = completedSubtasks.filter(
		s => s.completedBy === user.name || s.lateCompletedBy === user.name || s.forgottenBy === user.name
	).length;

	// Count weeks where user had at least one late task
	let weeksLate = 0;
	for (const [, weekTasks] of tasksByWeekId) {
		const hasLateTask = weekTasks.some(s => s.lateCompletedBy === user.name && s.daysLate > 0);
		if (hasLateTask) {
			weeksLate++;
		}
	}

	// Get unique week IDs and fetch week details
	const weekIds = Array.from(tasksByWeekId.keys()).map(id => toObjectId(id)!);
	const weeks = await weeksColl
		.find({ _id: { $in: weekIds } })
		.sort({ startDate: -1 })
		.limit(limit)
		.toArray();

	// Build response with smiles/frowns totals per week
	const weeklyTasks = weeks.map(week => {
		const weekSubtasks = tasksByWeekId.get(week._id!.toString()) || [];
		const totalSmiles = weekSubtasks.reduce((sum, s) => sum + (s.smilesBy?.length ?? 0), 0);
		const totalFrowns = weekSubtasks.reduce((sum, s) => sum + (s.frownsBy?.length ?? 0), 0);

		return {
			weekId: week._id!.toString(),
			weekNumber: week.weekNumber,
			year: week.year,
			startDate: week.startDate,
			endDate: week.endDate,
			totalSmiles,
			totalFrowns,
			completedSubtasks: weekSubtasks.map(s => ({
				_id: s._id!.toString(),
				subtaskName: s.subtaskName,
				taskGroupName: s.taskGroupName,
				completedAt: s.completedAt,
				lateCompletedAt: s.lateCompletedAt,
				daysLate: s.daysLate,
				forgotten: s.forgotten,
				smiles: s.smilesBy?.length ?? 0,
				frowns: s.frownsBy?.length ?? 0
			}))
		};
	});

	return json({
		stats: {
			totalCompleted,
			weeksLate
		},
		weeklyTasks
	});
};
