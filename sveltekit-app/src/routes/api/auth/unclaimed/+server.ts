/**
 * GET /api/auth/unclaimed
 *
 * Public endpoint (no auth required).
 * Returns users who haven't set up their account yet.
 *
 * A user is "unclaimed" if their email is null (no credentials created).
 * These users exist in the database (created by admin seed data) but
 * haven't visited the setup page to create their login.
 *
 * Response: { users: [{ _id, name, emoji }] }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsersCollection } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	const usersColl = await getUsersCollection();

	// Find users with no password set (haven't claimed their account)
	// A user is unclaimed if passwordHash is empty, regardless of whether email is set
	const unclaimed = await usersColl
		.find(
			{ passwordHash: '', active: true },
			{ projection: { _id: 1, name: 1, emoji: 1 } }
		)
		.sort({ name: 1 })
		.toArray();

	return json({ users: unclaimed });
};
