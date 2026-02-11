import { writable } from 'svelte/store';

/**
 * The ID of the week currently being viewed.
 * null = viewing the active (current) week.
 */
export const viewingWeekId = writable<string | null>(null);
