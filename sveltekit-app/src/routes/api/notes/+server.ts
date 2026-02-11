/**
 * POST /api/notes
 * Adds a note to a specific subtask (shared across all task groups).
 * Notes are permanent reminders stored globally by subtask name (e.g., "Don't forget behind the stove").
 *
 * Request body: {
 *   subtaskName: string,     // e.g., "Stove", "Kitchen"
 *   text: string             // The note content
 * }
 *
 * Response: { subtaskNote }
 *
 * DELETE /api/notes
 * Removes a specific note from a subtask.
 *
 * Request body: {
 *   subtaskName: string,
 *   noteIndex: number        // Index of the note to remove
 * }
 *
 * Response: { subtaskNote }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubtaskNotesCollection } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { subtaskName, text } = await request.json();

	if (!subtaskName || !text) {
		return json({ error: 'subtaskName and text are required' }, { status: 400 });
	}

	if (typeof text !== 'string' || text.trim().length === 0) {
		return json({ error: 'Note text cannot be empty' }, { status: 400 });
	}

	const subtaskNotesColl = await getSubtaskNotesCollection();

	const note = {
		text: text.trim(),
		addedBy: locals.user.name,
		addedAt: new Date()
	};

	// Upsert: if subtaskName doesn't exist, create it; otherwise push to notes array
	const updatedNote = await subtaskNotesColl.findOneAndUpdate(
		{ subtaskName },
		{
			$push: { notes: note },
			$set: { updatedAt: new Date() },
			$setOnInsert: { subtaskName }
		},
		{ upsert: true, returnDocument: 'after' }
	);

	return json({ subtaskNote: updatedNote });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { subtaskName, noteIndex } = await request.json();

	if (!subtaskName || typeof noteIndex !== 'number') {
		return json({ error: 'subtaskName and noteIndex are required' }, { status: 400 });
	}

	const subtaskNotesColl = await getSubtaskNotesCollection();

	// Fetch the subtask note document to validate the note exists
	const subtaskNote = await subtaskNotesColl.findOne({ subtaskName });

	if (!subtaskNote || !subtaskNote.notes || noteIndex < 0 || noteIndex >= subtaskNote.notes.length) {
		return json({ error: 'Note not found at that index' }, { status: 404 });
	}

	// Only the note author or admin/accountant can delete
	const noteAuthor = subtaskNote.notes[noteIndex].addedBy;
	const isAuthor = noteAuthor === locals.user.name;
	const isPrivileged = locals.user.role === 'admin' || locals.user.role === 'accountant';

	if (!isAuthor && !isPrivileged) {
		return json({ error: 'Only the author or admin can delete this note' }, { status: 403 });
	}

	// Remove the note by splicing the array
	// MongoDB doesn't have a direct "remove by index" so we use a two-step approach:
	// 1. Set the element at that index to null
	// 2. Pull all null values from the array
	const unsetKey = `notes.${noteIndex}`;
	await subtaskNotesColl.updateOne(
		{ subtaskName },
		{ $unset: { [unsetKey]: 1 } }
	);

	const updatedNote = await subtaskNotesColl.findOneAndUpdate(
		{ subtaskName },
		{
			$pull: { notes: null as any },
			$set: { updatedAt: new Date() }
		},
		{ returnDocument: 'after' }
	);

	return json({ subtaskNote: updatedNote });
};
