/**
 * SvelteKit Server Hooks
 *
 * This file runs on EVERY server-side request before your route handlers.
 * Think of it like a security guard at the building entrance:
 *
 *   Request comes in → hooks.server.ts checks the cookie → attaches user info
 *   → request continues to actual route (which can now access the user)
 *
 * KEY CONCEPTS:
 * - `event`: The incoming request (contains URL, cookies, headers, locals)
 * - `event.locals`: A "bag" to attach data to (lives for one request only)
 * - `event.cookies`: SvelteKit's cookie API (read/write HTTP cookies)
 * - `resolve`: Call this to continue to the actual route handler
 *
 * WHY HOOKS?
 * Without hooks, every route would need to:
 *   1. Read the cookie
 *   2. Verify the JWT
 *   3. Look up the user
 * With hooks, we do this ONCE and every route just checks event.locals.user
 */

import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';
import { initializeCronJobs } from '$lib/server/cron';

// ========================================
// Initialize cron jobs (runs once on server start)
// ========================================
let cronInitialized = false;
if (!cronInitialized) {
	initializeCronJobs();
	cronInitialized = true;
}

// Name of the cookie that stores the JWT token
// HTTP-only cookie = JavaScript in the browser CANNOT read it (prevents XSS)
const SESSION_COOKIE = 'session';

// Routes that don't require authentication
// These need to be accessible without logging in (otherwise you can't log in!)
const PUBLIC_ROUTES = [
	'/api/auth/login',
	'/api/auth/unclaimed',
	'/api/auth/setup',
	'/api/auth/reset-password',
	'/api/health',
	'/login',
	'/setup'
];

/**
 * The handle function - SvelteKit calls this on every request
 *
 * @param event - The incoming request with cookies, URL, headers, locals
 * @param resolve - Call this to continue to the actual route handler
 */
export const handle: Handle = async ({ event, resolve }) => {
	// ========================================
	// STEP 1: Read the JWT from the cookie
	// ========================================
	// The browser automatically sends cookies with every request
	// We just need to read the one called "session"
	const token = event.cookies.get(SESSION_COOKIE);

	// ========================================
	// STEP 2: Verify the JWT and attach user info
	// ========================================
	if (token) {
		// We have a cookie - try to verify the JWT signature
		// This checks:
		//   - Is the signature valid? (was it signed with our JWT_SECRET?)
		//   - Is it expired? (past the 7-day expiration?)
		const payload = verifyToken(token);

		if (payload) {
			// JWT is valid! Attach user info to event.locals
			// Now EVERY route handler can access event.locals.user
			event.locals.user = {
				userId: payload.userId,
				name: payload.name,
				role: payload.role
			};
		} else {
			// JWT is invalid or expired
			// Clear the bad cookie so the browser stops sending it
			event.locals.user = null;
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	} else {
		// No cookie at all - user hasn't logged in
		event.locals.user = null;
	}

	// ========================================
	// STEP 3: Protect API routes
	// ========================================
	// Check if this is an API route that requires authentication
	const isPublicRoute = PUBLIC_ROUTES.some((route) =>
		event.url.pathname.startsWith(route)
	);
	const isApiRoute = event.url.pathname.startsWith('/api');

	if (isApiRoute && !isPublicRoute && !event.locals.user) {
		// Trying to access a protected API without being logged in
		// Return 401 Unauthorized immediately (don't even reach the route)
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// ========================================
	// STEP 4: Continue to the actual route
	// ========================================
	// Everything checks out - let the request through to the route handler
	// The route can now access event.locals.user to know who's making the request
	const response = await resolve(event);
	return response;
};
