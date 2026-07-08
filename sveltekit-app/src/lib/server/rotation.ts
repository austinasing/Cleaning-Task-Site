/**
 * Task rotation logic
 * Maps taskTeam (1-8) × rotationPeriod (1-16) → taskGroupName
 *
 * 6 logical tasks rotate across 8 groups over 16 periods.
 * Kitchen (fri/mon) and toilet (front/back) alternate for each group
 * by swapping variants every 4 periods (periods 5-8 and 13-16).
 */

// Rotation matrix: rotationMatrix[taskGroupName][period - 1] = teamNumber
const ROTATION_MATRIX: Record<string, number[]> = {
	kitchen_fri: [3, 5, 7, 1, 4, 6, 8, 2, 3, 5, 7, 1, 4, 6, 8, 2],
	kitchen_mon: [4, 6, 8, 2, 3, 5, 7, 1, 4, 6, 8, 2, 3, 5, 7, 1],
	reserve: [6, 8, 2, 4, 5, 7, 1, 3, 6, 8, 2, 4, 5, 7, 1, 3],
	garbage: [5, 7, 1, 3, 6, 8, 2, 4, 5, 7, 1, 3, 6, 8, 2, 4],
	toilet_front: [7, 1, 3, 5, 8, 2, 4, 6, 7, 1, 3, 5, 8, 2, 4, 6],
	toilet_back: [8, 2, 4, 6, 7, 1, 3, 5, 8, 2, 4, 6, 7, 1, 3, 5],
	hallway: [2, 4, 6, 8, 1, 3, 5, 7, 2, 4, 6, 8, 1, 3, 5, 7],
	bathroom: [1, 3, 5, 7, 2, 4, 6, 8, 1, 3, 5, 7, 2, 4, 6, 8]
};

/**
 * Get the task group name assigned to a team for a given rotation period
 * @param taskTeam - User's permanent task team (1-8)
 * @param rotationPeriod - Current rotation period (1-16)
 * @returns Task group name (e.g., 'kitchen_fri', 'bathroom') or null if no assignment
 */
export function getTaskGroupForTeam(taskTeam: number, rotationPeriod: number): string | null {
	if (!taskTeam || taskTeam < 1 || taskTeam > 8) return null;
	if (!rotationPeriod || rotationPeriod < 1 || rotationPeriod > 16) return null;

	// Find which task group this team is assigned to in this period
	for (const [groupName, periods] of Object.entries(ROTATION_MATRIX)) {
		if (periods[rotationPeriod - 1] === taskTeam) {
			return groupName;
		}
	}

	return null;
}

/**
 * Get all team numbers assigned to a task group for a given rotation period
 * @param taskGroupName - Name of the task group (e.g., 'kitchen_fri')
 * @param rotationPeriod - Current rotation period (1-16)
 * @returns Array of team numbers assigned to this task
 */
export function getTeamsForTaskGroup(taskGroupName: string, rotationPeriod: number): number[] {
	if (!rotationPeriod || rotationPeriod < 1 || rotationPeriod > 16) return [];

	const periods = ROTATION_MATRIX[taskGroupName];
	if (!periods) return [];

	const assignedTeam = periods[rotationPeriod - 1];
	return [assignedTeam];
}
