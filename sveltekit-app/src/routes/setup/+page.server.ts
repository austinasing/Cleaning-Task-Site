import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

/**
 * Defines the shape of an unclaimed user object for type safety.
 */
export interface UnclaimedUser {
	_id: string;
	name: string;
}

/**
 * This load function runs on the server before the /setup page is rendered.
 * It fetches the list of users who have not yet claimed their accounts.
 */
export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/auth/unclaimed');

	if (!response.ok) {
		throw error(500, 'Failed to load user list. Please try again later.');
	}

	const data = await response.json();
	const unclaimedUsers: UnclaimedUser[] = data.users ?? data;
	return { unclaimedUsers };
};