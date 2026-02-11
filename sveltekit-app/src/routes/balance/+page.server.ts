import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const isPrivileged = locals.user?.role === 'admin' || locals.user?.role === 'accountant';

	// Fetch main balance data (includes current user balance and unclaimed fines)
	const res = await fetch('/api/admin/balances');
	if (!res.ok) {
		throw error(res.status, 'Failed to load balances');
	}
	const data = await res.json();

	// Fetch user list for admin forms
	const usersRes = await fetch('/api/users');
	const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

	// Fetch pending approvals for admin/accountant
	let pendingTransactions: unknown[] = [];
	if (isPrivileged) {
		const pendingRes = await fetch('/api/balance/pending');
		if (pendingRes.ok) {
			const pendingData = await pendingRes.json();
			pendingTransactions = pendingData.pendingTransactions || [];
		}
	}

	return {
		balances: data.balances,
		transactions: data.transactions,
		totalTransactions: data.totalTransactions,
		currentUserBalance: data.currentUserBalance,
		unclaimedFines: data.unclaimedFines || [],
		pendingTransactions,
		users: usersData.users,
		isPrivileged
	};
};
