/**
 * POST /api/auth/setup
 *
 * Public endpoint (no auth required).
 * Allows an unclaimed user to set up their account credentials.
 *
 * Flow:
 * 1. User visits /setup page
 * 2. Selects their name from dropdown (populated by GET /api/auth/unclaimed)
 * 3. Enters email + password
 * 4. This endpoint sets their email and passwordHash
 * 5. User is redirected to /login to sign in
 *
 * Request body: {
 *   userId: string,     // The _id of the user to claim
 *   email: string,      // Their chosen email address
 *   password: string    // Their chosen password (min 6 chars)
 * }
 *
 * Response: { message: "Account created", user: { name, email } }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, toObjectId } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	const { userId, email, password } = await request.json();

	// Validate inputs
	if (!userId || !email || !password) {
		return json({ error: 'userId, email, and password are all required' }, { status: 400 });
	}

	if (typeof email !== 'string' || !email.includes('@') || email.length < 5) {
		return json({ error: 'Please enter a valid email address' }, { status: 400 });
	}

	if (typeof password !== 'string' || password.length < 6) {
		return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
	}

	const id = toObjectId(userId);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();

	// Check that the user exists and hasn't been claimed yet
	const user = await usersColl.findOne({ _id: id });

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	if (user.passwordHash) {
		return json({ error: 'This account has already been set up' }, { status: 409 });
	}

	// Check email uniqueness (only among users who have set up their account)
	const emailTaken = await usersColl.findOne({ email: email.toLowerCase() });
	if (emailTaken) {
		return json({ error: 'This email is already in use' }, { status: 409 });
	}

	// Hash the password and save credentials
	const passwordHash = await hashPassword(password);

	await usersColl.updateOne(
		{ _id: id },
		{
			$set: {
				email: email.toLowerCase(),
				passwordHash,
				updatedAt: new Date()
			}
		}
	);

	return json({
		message: 'Account created',
		user: { name: user.name, email: email.toLowerCase() }
	});
};
