import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/extra-tasks');
	if (!res.ok) {
		throw error(res.status, 'Failed to load extra tasks');
	}
	const data = await res.json();
	return { tasks: data.tasks };
};
