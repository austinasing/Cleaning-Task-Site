/**
 * GET /api/users
 *
 * Returns all active users (for dropdowns, team displays, etc.)
 * Excludes sensitive fields like passwordHash.
 *
 * Optional query params:
 *   ?all=true   Include inactive users too (admin/accountant only)
 *
 * Response: { users: [...] }
 *
 * POST /api/users (admin only)
 *
 * Creates a new unclaimed user account.
 *
 * Request body: { name: string }
 * Response: { user }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const includeInactive =
		url.searchParams.get('all') === 'true' &&
		(user.role === 'admin' || user.role === 'accountant');

	const usersColl = await getUsersCollection();

	const filter = includeInactive ? {} : { active: true };

	const users = await usersColl
		.find(filter, {
			// Projection: exclude sensitive fields
			projection: {
				passwordHash: 0,
				preferences: 0
			}
		})
		.sort({ name: 1 })
		.toArray();

	return json({ users });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Only admins can create new users
	if (locals.user.role !== 'admin') {
		return json({ error: 'Only admins can create users' }, { status: 403 });
	}

	const body = await request.json();
	const { name } = body;

	if (!name || typeof name !== 'string' || name.trim().length < 2) {
		return json({ error: 'Name must be at least 2 characters' }, { status: 400 });
	}

	const usersColl = await getUsersCollection();

	// Check if name already exists
	const existing = await usersColl.findOne({ name: name.trim() });
	if (existing) {
		return json({ error: 'A user with this name already exists' }, { status: 409 });
	}

	const newUser = {
		name: name.trim(),
		active: true,
		passwordHash: '',
		role: 'member' as const,
		emoji: '',
		preferences: { emailNotifications: false },
		hallwayBalance: 0,
		stats: { tasksCompleted: 0, lateTasks: 0, timesForgot: 0 },
		createdAt: new Date(),
		updatedAt: new Date()
	};

	const result = await usersColl.insertOne(newUser);

	return json({
		user: { ...newUser, _id: result.insertedId }
	}, { status: 201 });
};
