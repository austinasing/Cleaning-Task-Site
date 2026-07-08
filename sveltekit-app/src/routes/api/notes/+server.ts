/**
 * POST /api/notes
 * Adds a tip to a specific task group (shared across all subtasks in that group).
 * Notes are permanent reminders stored as individual documents.
 *
 * Request body: {
 *   taskGroupName: string,
 *   text: string
 * }
 *
 * Response: { note }
 *
 * DELETE /api/notes
 * Removes a specific note by its _id.
 * Only the author or admin/accountant can delete.
 *
 * Request body: {
 *   noteId: string
 * }
 *
 * Response: { ok: true }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTaskGroupNotesCollection, toObjectId } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { taskGroupName, text } = await request.json();

	if (!taskGroupName || !text) {
		return json({ error: 'taskGroupName and text are required' }, { status: 400 });
	}

	if (typeof text !== 'string' || text.trim().length === 0) {
		return json({ error: 'Note text cannot be empty' }, { status: 400 });
	}

	const taskGroupNotesColl = await getTaskGroupNotesCollection();

	const result = await taskGroupNotesColl.insertOne({
		taskGroupName,
		text: text.trim(),
		addedBy: locals.user.name,
		addedAt: new Date()
	});

	return json({ note: { _id: result.insertedId, taskGroupName, text: text.trim(), addedBy: locals.user.name, addedAt: new Date() } });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { noteId } = await request.json();

	if (!noteId) {
		return json({ error: 'noteId is required' }, { status: 400 });
	}

	const noteObjectId = toObjectId(noteId);
	if (!noteObjectId) {
		return json({ error: 'Invalid noteId' }, { status: 400 });
	}

	const taskGroupNotesColl = await getTaskGroupNotesCollection();
	const note = await taskGroupNotesColl.findOne({ _id: noteObjectId });

	if (!note) {
		return json({ error: 'Note not found' }, { status: 404 });
	}

	const isAuthor = note.addedBy === locals.user.name;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isAuthor && !isPrivileged) {
		return json({ error: 'Only the author or admin can delete this note' }, { status: 403 });
	}

	await taskGroupNotesColl.deleteOne({ _id: noteObjectId });

	return json({ ok: true });
};
