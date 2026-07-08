import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	// 1. Fetch the active week
	const weekRes = await fetch('/api/weeks/active');

	if (weekRes.status === 404) {
		return { activeWeek: null, taskGroups: [], allWeeks: [] };
	}
	if (!weekRes.ok) {
		throw error(weekRes.status, 'Failed to fetch active week');
	}
	const weekData = await weekRes.json();
	const activeWeek = weekData.week;

	// 2. Fetch all weeks for navigation
	const allWeeksRes = await fetch('/api/weeks');
	if (!allWeeksRes.ok) {
		throw error(allWeeksRes.status, 'Failed to fetch week list');
	}
	const allWeeksData = await allWeeksRes.json();
	const allWeeks = allWeeksData.weeks ?? allWeeksData;

	// 3. Fetch tasks for the active week (returns { week, taskGroups } with subtasks nested)
	const tasksRes = await fetch(`/api/tasks?weekId=${activeWeek._id}`);
	if (!tasksRes.ok) {
		throw error(tasksRes.status, `Failed to fetch tasks for week ${activeWeek.weekNumber}`);
	}
	const tasksData = await tasksRes.json();

	return {
		activeWeek,
		taskGroups: tasksData.taskGroups,
		userEmojiMap: tasksData.userEmojiMap ?? {},
		allWeeks
	};
};