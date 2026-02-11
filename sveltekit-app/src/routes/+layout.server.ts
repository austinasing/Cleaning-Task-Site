import type { LayoutServerLoad } from './$types';

/**
 * This load function runs on the server for every request.
 * It passes the user session data, populated by our hook, to the layout component.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
	};
};