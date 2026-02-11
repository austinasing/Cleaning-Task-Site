/**
 * GET /api/auth/session
 *
 * Returns the current user's session info.
 * Used by the frontend to check if the user is logged in
 * (e.g., on page load to decide whether to show login or dashboard).
 *
 * The user info comes from event.locals.user, which was set by hooks.server.ts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ authenticated: false });
	}

	return json({
		authenticated: true,
		user: locals.user
	});
};
