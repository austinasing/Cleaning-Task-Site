/**
 * GET /api/wishlist
 * Returns all wishlist items, sorted by vote count (most voted first).
 *
 * POST /api/wishlist
 * Adds a new item to the wishlist.
 *
 * Request body: { item: string }
 * Response: { wishlistItem }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWishlistCollection } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const wishlistColl = await getWishlistCollection();

	const items = await wishlistColl.find().toArray();

	// Sort by vote count descending, then by creation date
	items.sort((a, b) => b.votes.length - a.votes.length || b.createdAt.getTime() - a.createdAt.getTime());

	return json({ items });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { item } = await request.json();

	if (!item || typeof item !== 'string' || item.trim().length === 0) {
		return json({ error: 'item is required' }, { status: 400 });
	}

	const wishlistColl = await getWishlistCollection();

	const newItem = {
		item: item.trim(),
		votes: [],
		createdAt: new Date()
	};

	const result = await wishlistColl.insertOne(newItem);

	return json({
		wishlistItem: { _id: result.insertedId, ...newItem }
	});
};
