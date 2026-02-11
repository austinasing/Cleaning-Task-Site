/**
 * POST /api/auth/logout
 *
 * Logs out the user by clearing the session cookie.
 * The JWT token is stateless (not stored in database), so we just
 * delete the cookie and the browser stops sending it.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Delete the session cookie
	cookies.delete('session', { path: '/' });

	return json({ success: true });
};
