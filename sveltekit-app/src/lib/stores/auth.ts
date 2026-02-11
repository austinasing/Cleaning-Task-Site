import { writable } from 'svelte/store';

export interface SessionUser {
	userId: string;
	name: string;
	role: 'member' | 'admin' | 'accountant';
}

/**
 * Svelte store to hold the currently logged-in user's information.
 * It will be null if no user is logged in.
 * This store is updated upon successful login/logout and session checks.
 */
export const currentUser = writable<SessionUser | null>(null);