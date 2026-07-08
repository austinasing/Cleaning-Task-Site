import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWeeksCollection } from '$lib/server/db';
import { getTaskGroupForTeam } from '$lib/server/rotation';

const TASK_GROUP_DISPLAY_NAMES: Record<string, string> = {
	kitchen_fri: 'Kitchen (Fri)',
	kitchen_mon: 'Kitchen (Mon)',
	toilet_front: 'Toilet (Front)',
	toilet_back: 'Toilet (Back)',
	bathroom: 'Bathroom',
	hallway: 'Hallway',
	garbage: 'Garbage',
	supplies: 'Supplies',
	reserve: 'Reserve'
};

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
	const res = await fetch(`/api/users/${params.id}`);
	if (!res.ok) {
		throw error(res.status, 'Failed to load user profile');
	}
	const data = await res.json();

	const isOwnProfile = locals.user?.userId === params.id;
	const isPrivileged = locals.user?.role === 'admin' || locals.user?.role === 'accountant';

	// Fetch task history if viewing own profile or if privileged
	let taskHistory = null;
	if (isOwnProfile || isPrivileged) {
		const tasksRes = await fetch(`/api/users/${params.id}/tasks?limit=5`);
		if (tasksRes.ok) {
			taskHistory = await tasksRes.json();
		}
	}

	// Compute task schedule for this user (visible to own profile or privileged)
	let taskSchedule = null;
	const weeksColl = await getWeeksCollection();
	const activeWeek = await weeksColl.findOne({ status: 'active' });
	const currentRotationPeriod = activeWeek?.rotationPeriod || 1;

	if (data.user?.taskTeam && activeWeek) {
		// Get all weeks to find the start of each period
		const allWeeks = await weeksColl
			.find({})
			.sort({ year: 1, weekNumber: 1 })
			.toArray();

		// Group weeks by rotation period to find the first week of each period
		const periodStartWeek: Record<number, typeof allWeeks[0]> = {};
		for (const week of allWeeks) {
			const p = week.rotationPeriod!;
			if (!periodStartWeek[p] || week.startDate < periodStartWeek[p].startDate) {
				periodStartWeek[p] = week;
			}
		}

		// Build 8 periods starting from current
		taskSchedule = [];
		for (let i = 0; i < 8; i++) {
			const period = ((currentRotationPeriod - 1 + i) % 16) + 1;
			const groupName = getTaskGroupForTeam(data.user.taskTeam, period);
			const firstWeek = periodStartWeek[period];

			// Period is 4 weeks long: start date + 28 days - 1 millisecond
			const startDate = firstWeek?.startDate;
			const endDate = startDate ? new Date(startDate.getTime() + (28 * 24 * 60 * 60 * 1000) - 1) : null;

			taskSchedule.push({
				period,
				taskGroupName: groupName,
				displayName: groupName ? TASK_GROUP_DISPLAY_NAMES[groupName] || groupName : null,
				startDate: startDate?.toISOString() || null,
				endDate: endDate?.toISOString() || null,
				isCurrent: period === currentRotationPeriod
			});
		}
	}

	// For admins viewing their own profile, also fetch all users for management
	let allUsers = null;
	let taskGroups = null;
	if (locals.user?.role === 'admin' && isOwnProfile) {
		const usersRes = await fetch('/api/users?all=true');
		if (usersRes.ok) {
			const usersData = await usersRes.json();
			allUsers = usersData.users;
		}

		// Also fetch all task groups for override management (static members only)
		const taskGroupsRes = await fetch('/api/taskgroups');
		if (taskGroupsRes.ok) {
			const taskGroupsData = await taskGroupsRes.json();
			taskGroups = taskGroupsData.taskGroups;
		}

		// Compute rotation-based task group for each user (server-side, single source of truth)
		if (allUsers && taskGroups) {
			for (const user of allUsers) {
				if (user.taskTeam) {
					const groupName = getTaskGroupForTeam(user.taskTeam, currentRotationPeriod);
					if (groupName) {
						const group = taskGroups.find((g: any) => g.name === groupName);
						user._rotationTaskGroup = group ? { name: group.name, displayName: group.displayName } : null;
					}
				}
			}
		}
	}

	// Build rotation overview for admins: all groups' assignments across all 16 periods
	let rotationOverview = null;
	if (locals.user?.role === 'admin' && isOwnProfile) {
		rotationOverview = [];
		for (let period = 1; period <= 16; period++) {
			const assignments: { team: number; taskGroupName: string | null; displayName: string | null }[] = [];
			for (let team = 1; team <= 8; team++) {
				const groupName = getTaskGroupForTeam(team, period);
				assignments.push({
					team,
					taskGroupName: groupName,
					displayName: groupName ? TASK_GROUP_DISPLAY_NAMES[groupName] || groupName : null
				});
			}
			rotationOverview.push({
				period,
				isCurrent: period === currentRotationPeriod,
				assignments
			});
		}
	}

	return { profile: data.user, allUsers, taskGroups, taskHistory, currentRotationPeriod, taskSchedule, rotationOverview };
};
