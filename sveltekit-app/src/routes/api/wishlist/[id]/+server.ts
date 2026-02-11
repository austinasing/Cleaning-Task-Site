/**
 * PATCH /api/wishlist/[id]
 * Toggles the current user's vote on a wishlist item.
 * If already voted, removes vote. If not voted, adds vote.
 *
 * Response: { wishlistItem }
 *
 * DELETE /api/wishlist/[id]
 * Removes a wishlist item.
 *
 * Response: { message: "Item deleted" }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWishlistCollection, toObjectId } from '$lib/server/db';
import { ObjectId } from 'mongodb';

export const PATCH: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid wishlist item ID' }, { status: 400 });
	}

	const wishlistColl = await getWishlistCollection();
	const item = await wishlistColl.findOne({ _id: id });

	if (!item) {
		return json({ error: 'Wishlist item not found' }, { status: 404 });
	}

	const userId = new ObjectId(locals.user.userId);
	const alreadyVoted = item.votes.some((v) => v.toString() === locals.user!.userId);

	let updatedItem;
	if (alreadyVoted) {
		// Remove vote
		updatedItem = await wishlistColl.findOneAndUpdate(
			{ _id: id },
			{ $pull: { votes: userId } },
			{ returnDocument: 'after' }
		);
	} else {
		// Add vote
		updatedItem = await wishlistColl.findOneAndUpdate(
			{ _id: id },
			{ $addToSet: { votes: userId } },
			{ returnDocument: 'after' }
		);
	}

	return json({ wishlistItem: updatedItem });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const id = toObjectId(params.id);
	if (!id) {
		return json({ error: 'Invalid wishlist item ID' }, { status: 400 });
	}

	const wishlistColl = await getWishlistCollection();
	const result = await wishlistColl.deleteOne({ _id: id });

	if (result.deletedCount === 0) {
		return json({ error: 'Wishlist item not found' }, { status: 404 });
	}

	return json({ message: 'Item deleted' });
};
