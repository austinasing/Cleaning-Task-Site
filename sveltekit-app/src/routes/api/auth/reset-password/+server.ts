/**
 * POST /api/auth/reset-password
 *
 * Public endpoint (no auth required).
 * Resets a user's password by their email address.
 *
 * In a real production app, this would send an email with a reset link.
 * For this internal house app, we'll just directly reset the password with email verification.
 *
 * Request body: { email: string, newPassword: string }
 * Response: { success: true } or { error: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection } from '$lib/server/db';
import bcrypt from 'bcrypt';

export const POST: RequestHandler = async ({ request }) => {
	const { email, newPassword } = await request.json();

	// Validate input
	if (!email || !newPassword) {
		return json({ error: 'Email and new password are required' }, { status: 400 });
	}

	if (newPassword.length < 6) {
		return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();

	// Find user by email
	const user = await usersColl.findOne({ email, active: true });

	if (!user) {
		return json({ error: 'No account found with that email address' }, { status: 404 });
	}

	// Hash the new password
	const passwordHash = await bcrypt.hash(newPassword, 12);

	// Update the user's password
	await usersColl.updateOne({ _id: user._id }, { $set: { passwordHash, updatedAt: new Date() } });

	return json({ success: true });
};
