/**
 * GET /api/tasks
 *
 * Returns all task groups with their subtasks for a given week.
 * This is the MAIN endpoint for the dashboard.
 *
 * The frontend uses the members array on each task group to determine
 * which task belongs to the logged-in user (show expanded by default)
 * vs other tasks (show collapsed, expandable).
 *
 * Query params:
 *   ?weekId=<ObjectId>  - Specific week to load (default: active week)
 *
 * Response:
 * {
 *   week: { _id, weekNumber, year, status, ... },
 *   taskGroups: [
 *     {
 *       _id, name, displayName, members, notes, order,
 *       subtasks: [ { _id, subtaskName, completedBy, ... } ]
 *     },
 *     ...
 *   ]
 * }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getWeeksCollection,
	getTaskGroupsCollection,
	getSubtasksCollection,
	getTaskGroupNotesCollection,
	getUsersCollection,
	toObjectId
} from '$lib/server/db';
import { getTeamsForTaskGroup } from '$lib/server/rotation';

export const GET: RequestHandler = async ({ url }) => {
	// Determine which week to load
	const weekIdParam = url.searchParams.get('weekId');

	const weeks = await getWeeksCollection();
	let week;

	if (weekIdParam) {
		// Load specific week (for history navigation)
		const weekId = toObjectId(weekIdParam);
		if (!weekId) {
			return json({ error: 'Invalid weekId' }, { status: 400 });
		}
		week = await weeks.findOne({ _id: weekId });
	} else {
		// Load active week (default)
		week = await weeks.findOne({ status: 'active' });
	}

	if (!week) {
		return json({ error: 'Week not found' }, { status: 404 });
	}

	// Get all task groups, sorted by display order
	const taskGroupsColl = await getTaskGroupsCollection();
	const taskGroups = await taskGroupsColl.find().sort({ order: 1 }).toArray();

	// Get all users to compute dynamic task assignments based on rotation
	const usersColl = await getUsersCollection();
	const allUsers = await usersColl.find({ active: true }).toArray();

	// Compute task group members: merge override users (static) + rotating users (dynamic)
	const rotationPeriod = week.rotationPeriod || 1;
	const taskGroupsWithDynamicMembers = taskGroups.map((group) => {
		// 1. Start with override users (manually assigned to this task group)
		//    These users are in the group's static members array, regardless of their taskTeam
		const overrideMembers = group.members || [];

		// 2. Add rotating users (those with a taskTeam assigned to this group for this period)
		const assignedTeams = getTeamsForTaskGroup(group.name, rotationPeriod);
		const rotatingMembers = allUsers
			.filter((user) => user.taskTeam && assignedTeams.includes(user.taskTeam))
			.map((user) => ({
				userId: user._id!.toString(),
				name: user.name
			}));

		// 3. Merge both, avoiding duplicates (override members take precedence)
		const allMembers = [...overrideMembers];
		for (const member of rotatingMembers) {
			if (!allMembers.some((m) => m.userId === member.userId)) {
				allMembers.push(member);
			}
		}

		return {
			...group,
			members: allMembers
		};
	});

	// Get all subtasks for this week
	const subtasksColl = await getSubtasksCollection();
	const subtasks = await subtasksColl
		.find({ weekId: week._id })
		.sort({ order: 1 })
		.toArray();

	// Group subtasks by taskGroupName for efficient lookup
	const subtasksByGroup: Record<string, typeof subtasks> = {};
	for (const subtask of subtasks) {
		const groupName = subtask.taskGroupName;
		if (!subtasksByGroup[groupName]) {
			subtasksByGroup[groupName] = [];
		}
		subtasksByGroup[groupName].push(subtask);
	}

	// Fetch all task group notes (one document per note)
	const taskGroupNotesColl = await getTaskGroupNotesCollection();
	const allNotes = await taskGroupNotesColl.find().sort({ addedAt: 1 }).toArray();

	// Group individual note docs by taskGroupName
	const notesByGroup: Record<string, Array<{ _id: string; text: string; addedBy: string; addedAt: Date }>> = {};
	for (const note of allNotes) {
		if (!notesByGroup[note.taskGroupName]) {
			notesByGroup[note.taskGroupName] = [];
		}
		notesByGroup[note.taskGroupName].push({
			_id: note._id!.toString(),
			text: note.text,
			addedBy: note.addedBy,
			addedAt: note.addedAt
		});
	}

	// Build a name → emoji map from all active users
	const userEmojiMap: Record<string, string> = {};
	for (const user of allUsers) {
		userEmojiMap[user.name] = user.emoji || '';
	}

	// Combine task groups (with dynamic members) with their subtasks and shared notes
	const taskGroupsWithSubtasks = taskGroupsWithDynamicMembers.map((group) => {
		const groupSubtasks = subtasksByGroup[group.name] || [];

		return {
			...group,
			notes: notesByGroup[group.name] || [],
			subtasks: groupSubtasks
		};
	});

	return json({
		week,
		taskGroups: taskGroupsWithSubtasks,
		userEmojiMap
	});
};
