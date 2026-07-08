/**
 * POST /api/admin/weeks/generate
 *
 * Admin-only endpoint to generate week objects for future rotation planning.
 * Creates weeks with proper rotation periods (1-16 cycling) and visibility flags.
 * The 16-period rotation ensures teams alternate between duplicate tasks (kitchen_fri/mon, toilet_front/back).
 *
 * Request body: {
 *   years?: number,           // How many years to generate (default: 2)
 *   startRotationPeriod?: number  // Starting rotation period (default: current active week's period or 1)
 * }
 *
 * Response: { created: number, weeks: Week[] }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWeeksCollection, getSubtasksCollection, getTaskGroupsCollection } from '$lib/server/db';
import type { Week, Subtask } from '$lib/server/db';
import { ObjectId } from 'mongodb';

// Subtask templates for each task group (blockoutDay and order)
const SUBTASK_TEMPLATES: Record<string, Array<{ name: string; blockoutDay: number; order: number }>> = {
	kitchen_fri: [
		{ name: 'Sinks', blockoutDay: 5, order: 1 },
		{ name: 'Hotplate', blockoutDay: 5, order: 2 },
		{ name: 'Island', blockoutDay: 5, order: 3 },
		{ name: 'Counters', blockoutDay: 5, order: 4 },
		{ name: 'Chill Area', blockoutDay: 5, order: 5 },
		{ name: 'Sweep', blockoutDay: 5, order: 6 },
		{ name: 'Mop', blockoutDay: 5, order: 7 },
		{ name: 'Towels', blockoutDay: 5, order: 8 },
		{ name: 'Drying racks', blockoutDay: 5, order: 9 }
	],
	kitchen_mon: [
		{ name: 'Sinks', blockoutDay: 1, order: 1 },
		{ name: 'Hotplate', blockoutDay: 1, order: 2 },
		{ name: 'Island', blockoutDay: 1, order: 3 },
		{ name: 'Counters', blockoutDay: 1, order: 4 },
		{ name: 'Chill Area', blockoutDay: 1, order: 5 },
		{ name: 'Sweep', blockoutDay: 1, order: 6 },
		{ name: 'Mop', blockoutDay: 1, order: 7 },
		{ name: 'Towels', blockoutDay: 1, order: 8 },
		{ name: 'Drying racks', blockoutDay: 1, order: 9 }
	],
	toilet_front: [
		{ name: 'Seat + Bowl', blockoutDay: 1, order: 1 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 2 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 3 },
		{ name: 'Sink + Mirror', blockoutDay: 1, order: 4 },
		{ name: 'Walls + Door', blockoutDay: 1, order: 5 },
		{ name: 'Top up TP', blockoutDay: 1, order: 6 }
	],
	toilet_back: [
		{ name: 'Seat + Bowl', blockoutDay: 1, order: 1 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 2 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 3 },
		{ name: 'Sink + Mirror', blockoutDay: 1, order: 4 },
		{ name: 'Walls + Door', blockoutDay: 1, order: 5 },
		{ name: 'Top up TP', blockoutDay: 1, order: 6 }
	],
	bathroom: [
		{ name: 'Mid-Week Drains (Fri)', blockoutDay: 5, order: 1 },
		{ name: 'Front Cabins / Floor', blockoutDay: 1, order: 2 },
		{ name: 'Back Cabins / Floor', blockoutDay: 1, order: 3 },
		{ name: 'Sinks', blockoutDay: 1, order: 4 },
		{ name: 'Mirrors + Shelves', blockoutDay: 1, order: 5 },
		{ name: 'Sweep + Mop', blockoutDay: 1, order: 6 },
		{ name: 'Empty Bin', blockoutDay: 1, order: 7 },
		{ name: 'Clean Drains', blockoutDay: 1, order: 8 }
	],
	hallway: [
		{ name: 'Sweep', blockoutDay: 1, order: 1 },
		{ name: 'Mop', blockoutDay: 1, order: 2 }
	],
	garbage: [
		{ name: 'Glass', blockoutDay: 1, order: 1 },
		{ name: 'Paper', blockoutDay: 1, order: 2 },
		{ name: 'Check Bags (Wed)', blockoutDay: 3, order: 3 },
		{ name: 'Check Bags (Fri)', blockoutDay: 5, order: 4 },
		{ name: 'Check Bags (Mon)', blockoutDay: 1, order: 5 },
		{ name: 'Clean Bins', blockoutDay: 1, order: 6 }
	],
	supplies: [
		{ name: 'Air Freshener', blockoutDay: 1, order: 1 },
		{ name: 'Cleaning Liquid', blockoutDay: 1, order: 2 },
		{ name: 'Cleaning Spray', blockoutDay: 1, order: 3 },
		{ name: 'Dish Soap', blockoutDay: 1, order: 4 },
		{ name: 'Gloves', blockoutDay: 1, order: 5 },
		{ name: 'Hand Soap', blockoutDay: 1, order: 6 },
		{ name: 'Kitchen Paper', blockoutDay: 1, order: 7 },
		{ name: 'Toilet Paper', blockoutDay: 1, order: 8 },
		{ name: 'Trash Bags', blockoutDay: 1, order: 9 }
	]
};

/**
 * Calculate week start date (Tuesday 6AM CET) for a given week number and year
 */
function getWeekStartDate(year: number, weekNumber: number): Date {
	// Week 1 starts on the first Tuesday of the year (or January 1st if it's a Tuesday)
	const jan1 = new Date(Date.UTC(year, 0, 1, 5, 0, 0)); // 5AM UTC = 6AM CET
	const jan1Day = jan1.getUTCDay();

	// Find first Tuesday (day 2)
	let daysToFirstTuesday = (2 - jan1Day + 7) % 7;
	if (daysToFirstTuesday === 0 && jan1Day !== 2) {
		daysToFirstTuesday = 7;
	}

	const firstTuesday = new Date(jan1);
	firstTuesday.setUTCDate(jan1.getUTCDate() + daysToFirstTuesday);

	// Add weeks
	const weekStart = new Date(firstTuesday);
	weekStart.setUTCDate(firstTuesday.getUTCDate() + (weekNumber - 1) * 7);

	return weekStart;
}

/**
 * Calculate week end date (following Tuesday 5:59:59 AM CET)
 */
function getWeekEndDate(startDate: Date): Date {
	const endDate = new Date(startDate);
	endDate.setUTCDate(startDate.getUTCDate() + 7);
	endDate.setUTCMilliseconds(-1); // 1ms before next week starts
	return endDate;
}

/**
 * Create subtasks for a week
 */
function createSubtasksForWeek(weekId: ObjectId, taskGroups: string[]): Omit<Subtask, '_id'>[] {
	const subtasks: Omit<Subtask, '_id'>[] = [];
	const now = new Date();

	for (const groupName of taskGroups) {
		const templates = SUBTASK_TEMPLATES[groupName];
		if (!templates) continue;

		for (const template of templates) {
			subtasks.push({
				weekId,
				taskGroupName: groupName,
				subtaskName: template.name,
				blockoutDay: template.blockoutDay,
				completedBy: null,
				completedAt: null,
				lateCompletedBy: null,
				lateCompletedAt: null,
				daysLate: 0,
				forgotten: false,
				forgottenBy: null,
				smilesBy: [],
				frownsBy: [],
				order: template.order,
				unclaimedFineProcessed: false,
				updatedAt: now
			});
		}
	}

	return subtasks;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Admin only
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const body = await request.json().catch(() => ({}));
	const yearsToGenerate = Math.min(Math.max(body.years || 2, 1), 5); // 1-5 years

	const weeksColl = await getWeeksCollection();
	const subtasksColl = await getSubtasksCollection();
	const taskGroupsColl = await getTaskGroupsCollection();

	// Get all task group names that have subtask templates
	const taskGroups = await taskGroupsColl.find().toArray();
	const taskGroupNames = taskGroups.map(g => g.name).filter(name => SUBTASK_TEMPLATES[name]);

	// Find the most recent week to determine starting point
	const latestWeek = await weeksColl.findOne({}, { sort: { year: -1, weekNumber: -1 } });

	let startYear: number;
	let startWeekNumber: number;
	let startRotationPeriod: number;

	// Track how many weeks into the current period we are
	let weeksInCurrentPeriod = 0;

	if (latestWeek) {
		// Continue from after the latest week
		startYear = latestWeek.year;
		startWeekNumber = latestWeek.weekNumber + 1;
		// Handle year rollover (approximately 52-53 weeks per year)
		if (startWeekNumber > 52) {
			startWeekNumber = 1;
			startYear++;
		}
		// Continue with same rotation period as latest week
		// We'll track weeks and increment every 4 weeks
		startRotationPeriod = latestWeek.rotationPeriod || 1;

		// Calculate how many weeks into the current period the latest week is
		// We need to count backwards to find when this period started
		// For simplicity, assume latest week is week 1 of its period if we don't have history
		// This will be corrected by the user if needed, or we continue from week 1
		weeksInCurrentPeriod = 1; // Latest week is week 1 of period (as user stated)
	} else {
		// No weeks exist, start fresh
		startYear = new Date().getFullYear();
		startWeekNumber = 1;
		startRotationPeriod = body.startRotationPeriod || 1;
		weeksInCurrentPeriod = 0;
	}

	const now = new Date();
	const createdWeeks: Week[] = [];
	const allSubtasks: Omit<Subtask, '_id'>[] = [];

	let currentYear = startYear;
	let currentWeekNumber = startWeekNumber;
	let currentRotationPeriod = startRotationPeriod;
	const endYear = startYear + yearsToGenerate;

	// Generate weeks until we've covered the requested years
	while (currentYear < endYear || (currentYear === endYear && currentWeekNumber <= 52)) {
		// Check if this week already exists
		const existingWeek = await weeksColl.findOne({
			year: currentYear,
			weekNumber: currentWeekNumber
		});

		if (!existingWeek) {
			const weekId = new ObjectId();
			const startDate = getWeekStartDate(currentYear, currentWeekNumber);
			const endDate = getWeekEndDate(startDate);

			// Determine status based on timing
			let status: 'completed' | 'active' | 'future';
			if (endDate < now) {
				status = 'completed'; // Week has ended
			} else if (startDate <= now && now <= endDate) {
				status = 'active'; // Week is currently ongoing
			} else {
				status = 'future'; // Week hasn't started yet
			}

			const week: Week = {
				_id: weekId,
				weekNumber: currentWeekNumber,
				year: currentYear,
				startDate,
				endDate,
				status,
				rotationPeriod: currentRotationPeriod
			};

			createdWeeks.push(week);

			// Create subtasks for this week
			const weekSubtasks = createSubtasksForWeek(weekId, taskGroupNames);
			allSubtasks.push(...weekSubtasks);
		}

		// Advance to next week
		currentWeekNumber++;
		weeksInCurrentPeriod++;

		// Advance to next rotation period after 4 weeks
		if (weeksInCurrentPeriod >= 4) {
			currentRotationPeriod = (currentRotationPeriod % 16) + 1; // Cycle 1-16
			weeksInCurrentPeriod = 0;
		}

		// Handle year rollover
		if (currentWeekNumber > 52) {
			currentWeekNumber = 1;
			currentYear++;
		}
	}

	// Bulk insert all weeks and subtasks
	if (createdWeeks.length > 0) {
		await weeksColl.insertMany(createdWeeks);
	}

	if (allSubtasks.length > 0) {
		await subtasksColl.insertMany(allSubtasks as Subtask[]);
	}

	return json({
		created: createdWeeks.length,
		subtasksCreated: allSubtasks.length,
		message: `Generated ${createdWeeks.length} weeks with ${allSubtasks.length} subtasks`
	});
};
