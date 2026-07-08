/**
 * GET /api/health
 *
 * Used by the Docker healthcheck to confirm the app is up AND can reach
 * MongoDB - not just that the Node process is running.
 */

import { json } from '@sveltejs/kit';
import { connectToDatabase } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const db = await connectToDatabase();
		await db.command({ ping: 1 });
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'error' }, { status: 503 });
	}
};
