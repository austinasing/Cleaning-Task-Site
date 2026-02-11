/**
 * Blockout Logic
 *
 * Ported from the original script.js, adapted for the week-based system.
 *
 * Each subtask has a blockoutDay (1, 3, or 5). The blockout trigger fires
 * on the day AFTER (blockoutDay + 1) at 6AM, relative to the week's start date.
 * Once triggered, the subtask stays locked for that week permanently.
 *
 * Week startDate = Tuesday 6AM. Blockout schedule:
 *   blockoutDay 1 → Tue 6AM (next week's start = startDate + 7 days)
 *   blockoutDay 3 → Thu 6AM (startDate + 2 days)
 *   blockoutDay 5 → Sat 6AM (startDate + 4 days)
 */

/**
 * Calculates the exact datetime when a subtask becomes blocked.
 *
 * @param weekStartDate - The week's start date (Tuesday 6AM)
 * @param blockoutDay - The subtask's blockout day (1, 3, or 5)
 * @returns The Date when the blockout begins
 */
export function getBlockoutDate(weekStartDate: Date, blockoutDay: number): Date {
	const start = new Date(weekStartDate.getTime());
	const adjustedTrigger = blockoutDay + 1; // 2=Tue, 4=Thu, 6=Sat

	let daysToAdd: number;
	if (adjustedTrigger === 2) {
		// Tuesday tasks: blocked at start of next week
		daysToAdd = 7;
	} else if (adjustedTrigger === 4) {
		// Thursday tasks: blocked 2 days after week start
		daysToAdd = 2;
	} else if (adjustedTrigger === 6) {
		// Saturday tasks: blocked 4 days after week start
		daysToAdd = 4;
	} else {
		// Fallback: block at next week start
		daysToAdd = 7;
	}

	start.setDate(start.getDate() + daysToAdd);
	return start;
}

/**
 * Checks whether submission is currently blocked for a given subtask.
 *
 * @param weekStartDate - The week's start date (Tuesday 6AM)
 * @param blockoutDay - The subtask's blockout day (1, 3, or 5)
 * @param now - Optional date for testing (defaults to current time)
 * @returns true if submissions are currently blocked
 */
export function isSubmissionBlocked(
	weekStartDate: Date,
	blockoutDay: number,
	now?: Date
): boolean {
	const current = now ?? new Date();
	const blockoutDate = getBlockoutDate(weekStartDate, blockoutDay);
	return current >= blockoutDate;
}

/**
 * Returns a human-readable message when a subtask is locked.
 *
 * @param weekStartDate - The week's start date (Tuesday 6AM)
 * @param blockoutDay - The subtask's blockout day (1, 3, or 5)
 * @returns A message describing when the blockout started
 */
export function getBlockoutMessage(weekStartDate: Date, blockoutDay: number): string {
	const blockoutDate = getBlockoutDate(weekStartDate, blockoutDay);
	const day = blockoutDate.toLocaleDateString('en-US', { weekday: 'long' });
	return `This task has been locked since ${day} at 6:00 AM.`;
}
