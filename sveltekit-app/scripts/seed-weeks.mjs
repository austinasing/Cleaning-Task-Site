/**
 * Seed script: wipes weeks + subtasks, recreates 2 completed + 1 active + 1 future week.
 * Preserves users, taskGroups, and hallwayTransactions.
 *
 * Usage:
 *   cd sveltekit-app
 *   node --env-file=.env scripts/seed-weeks.mjs
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'cleaning_tasks';

if (!MONGO_URI) {
	console.error('MONGO_URI not set. Run with: node --env-file=.env scripts/seed-weeks.mjs');
	process.exit(1);
}

// Copied from generate/+server.ts — keep in sync if templates change
const SUBTASK_TEMPLATES = {
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

// Find the most recent Tuesday at 6AM UTC on or before `date`
function getMostRecentTuesdayStart(date) {
	const d = new Date(date);
	// Go back to the most recent Tuesday
	const dayOfWeek = d.getUTCDay(); // 0=Sun, 2=Tue
	const daysBack = (dayOfWeek - 2 + 7) % 7;
	d.setUTCDate(d.getUTCDate() - daysBack);
	d.setUTCHours(5, 0, 0, 0); // 5AM UTC = 6AM CET
	return d;
}

function addWeeks(date, n) {
	const d = new Date(date);
	d.setUTCDate(d.getUTCDate() + n * 7);
	return d;
}

function getWeekEndDate(startDate) {
	const end = new Date(startDate);
	end.setUTCDate(startDate.getUTCDate() + 7);
	end.setUTCMilliseconds(-1);
	return end;
}

function getISOWeekNumber(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function createSubtasksForWeek(weekId, taskGroupNames) {
	const now = new Date();
	const subtasks = [];
	for (const groupName of taskGroupNames) {
		const templates = SUBTASK_TEMPLATES[groupName];
		if (!templates) continue;
		for (const t of templates) {
			subtasks.push({
				weekId,
				taskGroupName: groupName,
				subtaskName: t.name,
				blockoutDay: t.blockoutDay,
				completedBy: null,
				completedAt: null,
				lateCompletedBy: null,
				lateCompletedAt: null,
				daysLate: 0,
				forgotten: false,
				forgottenBy: null,
				smilesBy: [],
				frownsBy: [],
				order: t.order,
				unclaimedFineProcessed: false,
				updatedAt: now
			});
		}
	}
	return subtasks;
}

async function main() {
	const client = new MongoClient(MONGO_URI);
	await client.connect();
	const db = client.db(MONGO_DATABASE);

	console.log(`Connected to: ${MONGO_DATABASE}`);

	// Drop only weeks and subtasks
	await db.collection('weeks').drop().catch(() => {}); // ignore if doesn't exist
	await db.collection('subtasks').drop().catch(() => {});
	console.log('Dropped weeks and subtasks collections.');

	// Get task group names from DB (must match what SUBTASK_TEMPLATES covers)
	const taskGroups = await db.collection('taskGroups').find().toArray();
	const taskGroupNames = taskGroups.map((g) => g.name).filter((n) => SUBTASK_TEMPLATES[n]);
	console.log(`Task groups found: ${taskGroupNames.join(', ') || '(none — weeks will have no subtasks)'}`);

	const now = new Date();
	// Start 2 weeks before current week; end after Dec 31 2027
	const startDate = addWeeks(getMostRecentTuesdayStart(now), -2);
	const cutoff = new Date(Date.UTC(2028, 0, 1)); // Jan 1 2028 — stop before this

	// Rotation period cycles 1-16, advancing every 4 weeks.
	// Anchor: period 15 for the first generated week (2 weeks ago).
	let rotationPeriod = 15;
	let weeksInCurrentPeriod = 0;

	const allWeeks = [];
	const allSubtasks = [];

	let weekStart = new Date(startDate);
	while (weekStart < cutoff) {
		const weekEnd = getWeekEndDate(weekStart);
		const weekNumber = getISOWeekNumber(weekStart);
		const year = weekStart.getUTCFullYear();
		const weekId = new ObjectId();

		let status;
		if (weekEnd < now) {
			status = 'completed';
		} else if (weekStart <= now) {
			status = 'active';
		} else {
			status = 'future';
		}

		allWeeks.push({
			_id: weekId,
			weekNumber,
			year,
			startDate: new Date(weekStart),
			endDate: weekEnd,
			status,
			rotationPeriod
		});

		const subtasks = createSubtasksForWeek(weekId, taskGroupNames);
		allSubtasks.push(...subtasks);

		// Advance rotation period every 4 weeks
		weeksInCurrentPeriod++;
		if (weeksInCurrentPeriod >= 4) {
			rotationPeriod = (rotationPeriod % 16) + 1;
			weeksInCurrentPeriod = 0;
		}

		weekStart = addWeeks(weekStart, 1);
	}

	// Log summary by status
	const counts = { completed: 0, active: 0, future: 0 };
	for (const w of allWeeks) counts[w.status]++;
	console.log(`  ${counts.completed} completed, ${counts.active} active, ${counts.future} future weeks`);
	console.log(`  First: ${allWeeks[0].startDate.toISOString().split('T')[0]}, Last: ${allWeeks.at(-1).startDate.toISOString().split('T')[0]}`);

	await db.collection('weeks').insertMany(allWeeks);
	if (allSubtasks.length > 0) {
		await db.collection('subtasks').insertMany(allSubtasks);
	}

	console.log(`\nInserted ${allWeeks.length} weeks and ${allSubtasks.length} subtasks.`);
	await client.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
