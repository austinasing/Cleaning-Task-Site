/**
 * GET /api/users/[id]
 * Returns a single user's profile (excludes passwordHash).
 * Any authenticated user can view profiles.
 *
 * PATCH /api/users/[id]
 * Updates user profile fields (emoji, preferences).
 * Users can only update their own profile; admin/accountant can update anyone.
 *
 * Allowed fields: name, emoji, preferences.emailNotifications, active (admin only), role (admin only), taskTeam (admin only)
 *
 * Request body (all optional): {
 *   emoji?: string,
 *   preferences?: { emailNotifications?: boolean },
 *   active?: boolean,   // admin/accountant only
 *   taskTeam?: number | null  // admin only, 1-8 or null
 * }
 *
 * Response: { user }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection, toObjectId } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const isOwnProfile = locals.user.userId === params.id;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isOwnProfile && !isPrivileged) {
		return json({ error: 'You can only view your own profile' }, { status: 403 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();
	const user = await usersColl.findOne(
		{ _id: id },
		{ projection: { passwordHash: 0 } }
	);

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({ user });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid user ID' }, { status: 400 });
	}

	// Users can only update their own profile, unless admin/accountant
	const isOwnProfile = locals.user.userId === params.id;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isOwnProfile && !isPrivileged) {
		return json({ error: 'You can only update your own profile' }, { status: 403 });
	}

	const body = await request.json();

	// Build update object from allowed fields only
	const update: Record<string, unknown> = {};

	// Name can be updated by anyone for their own profile
	if (typeof body.name === 'string' && body.name.trim().length >= 2) {
		update.name = body.name.trim();
	}

	if (typeof body.emoji === 'string') {
		update.emoji = body.emoji;
	}

	if (body.preferences && typeof body.preferences.emailNotifications === 'boolean') {
		update['preferences.emailNotifications'] = body.preferences.emailNotifications;
	}

	// Only admin can toggle active status
	if (isPrivileged && typeof body.active === 'boolean') {
		update.active = body.active;
	}

	// Only admin can change roles
	if (locals.user.role === 'admin' && typeof body.role === 'string') {
		const validRoles = ['member', 'accountant', 'admin'];
		if (validRoles.includes(body.role)) {
			update.role = body.role;
		}
	}

	// Only admin can change taskTeam (1-8 or null)
	if (locals.user.role === 'admin' && 'taskTeam' in body) {
		if (body.taskTeam === null) {
			update.taskTeam = null;
		} else if (typeof body.taskTeam === 'number' && body.taskTeam >= 1 && body.taskTeam <= 8) {
			update.taskTeam = body.taskTeam;
		}
	}

	if (Object.keys(update).length === 0) {
		return json({ error: 'No valid fields to update' }, { status: 400 });
	}

	update.updatedAt = new Date();

	const usersColl = await getUsersCollection();
	const result = await usersColl.findOneAndUpdate(
		{ _id: id },
		{ $set: update },
		{ returnDocument: 'after', projection: { passwordHash: 0 } }
	);

	if (!result) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({ user: result });
};
