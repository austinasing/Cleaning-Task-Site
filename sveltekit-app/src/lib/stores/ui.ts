import { writable } from 'svelte/store';

/**
 * Set of task group names that are currently expanded on the dashboard.
 * The user's own group is added by default in the dashboard page.
 */
export const expandedGroups = writable<Set<string>>(new Set());

export function toggleGroup(groupName: string) {
	expandedGroups.update((set) => {
		const next = new Set(set);
		if (next.has(groupName)) {
			next.delete(groupName);
		} else {
			next.add(groupName);
		}
		return next;
	});
}
