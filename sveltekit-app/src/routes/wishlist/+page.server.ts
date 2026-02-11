import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/wishlist');
	if (!res.ok) {
		throw error(res.status, 'Failed to load wishlist');
	}
	const data = await res.json();
	return { items: data.items };
};
