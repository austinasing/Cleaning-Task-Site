/**
 * POST /api/users/[id]/password
 *
 * Changes a user's password.
 * Requires the user's email for verification (no current password needed).
 *
 * Request body: {
 *   email: string,        // Must match the user's email on file
 *   newPassword: string   // Must be at least 6 characters
 * }
 *
 * Response: { message: "Password updated" }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, toObjectId } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const { email, newPassword } = await request.json();

	if (!email || typeof email !== 'string') {
		return json({ error: 'Email is required for verification' }, { status: 400 });
	}

	if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
		return json({ error: 'New password must be at least 6 characters' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const targetUser = await usersColl.findOne({ _id: id });

	if (!targetUser) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	// Verify email matches the account
	if (targetUser.email?.toLowerCase() !== email.toLowerCase()) {
		return json({ error: 'Email does not match this account' }, { status: 403 });
	}

	const newHash = await hashPassword(newPassword);

	await usersColl.updateOne(
		{ _id: id },
		{
			$set: {
				passwordHash: newHash,
				updatedAt: new Date()
			}
		}
	);

	return json({ message: 'Password updated' });
};
