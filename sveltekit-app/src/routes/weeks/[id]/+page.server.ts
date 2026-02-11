import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	// Fetch tasks for this specific week
	const tasksRes = await fetch(`/api/tasks?weekId=${params.id}`);
	if (!tasksRes.ok) {
		throw error(tasksRes.status, 'Failed to fetch tasks for this week');
	}
	const tasksData = await tasksRes.json();

	// Fetch all weeks for navigation
	const allWeeksRes = await fetch('/api/weeks');
	if (!allWeeksRes.ok) {
		throw error(allWeeksRes.status, 'Failed to fetch week list');
	}
	const allWeeksData = await allWeeksRes.json();

	return {
		week: tasksData.week,
		taskGroups: tasksData.taskGroups,
		allWeeks: allWeeksData.weeks ?? allWeeksData
	};
};
