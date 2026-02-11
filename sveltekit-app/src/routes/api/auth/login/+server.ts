/**
 * POST /api/auth/login
 *
 * Authenticates a user with email + password.
 * On success, sets an HTTP-only cookie with a JWT token.
 *
 * Request body: { email: string, password: string }
 * Response: { user: { name, role, emoji } } or { error: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection } from '$lib/server/db';
import { verifyPassword, createToken } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Parse the request body
	const { email, password } = await request.json();

	// Validate input
	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	// Find user by email (case-insensitive)
	const users = await getUsersCollection();
	const user = await users.findOne({
		email: { $regex: new RegExp(`^${email}$`, 'i') }
	});

	if (!user) {
		// Don't reveal whether the email exists or not (security best practice)
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	// Check if user is active
	if (!user.active) {
		return json({ error: 'Account is inactive' }, { status: 403 });
	}

	// Verify password against stored bcrypt hash
	const isValid = await verifyPassword(password, user.passwordHash);
	if (!isValid) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	// Create JWT token
	const token = createToken(user._id, user.name, user.role);

	// Set the session cookie
	// HTTP-only: JavaScript can't read it (prevents XSS)
	// SameSite lax: Only sent from same site (prevents CSRF)
	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // Set to true in production with HTTPS
		maxAge: 60 * 60 * 24 * 30 // 30 days in seconds
	});

	// Return user info (NOT the token - it's in the cookie)
	return json({
		user: {
			name: user.name,
			role: user.role,
			emoji: user.emoji
		}
	});
};
