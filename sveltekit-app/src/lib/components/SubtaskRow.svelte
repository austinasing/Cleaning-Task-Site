<script lang="ts">
	import { isSubmissionBlocked, getBlockoutMessage } from '$lib/utils/blockout';
	import { invalidateAll } from '$app/navigation';

	interface SubtaskData {
		_id: string;
		subtaskName: string;
		blockoutDay: number;
		completedBy: string | null;
		completedAt: string | null;
		lateCompletedBy: string | null;
		lateCompletedAt: string | null;
		daysLate: number;
		forgotten: boolean;
		forgottenBy: string | null;
		smiles: number;
		frowns: number;
	}

	interface NoteData {
		text: string;
		addedBy: string;
		addedAt: string;
	}

	let {
		subtask,
		weekStartDate,
		notes = [],
		readonly = false
	}: {
		subtask: SubtaskData;
		weekStartDate: string;
		notes?: NoteData[];
		readonly?: boolean;
	} = $props();

	// Track user's current vote for this session (prevents duplicate votes)
	let userVote = $state<'smile' | 'frown' | null>(null);

	let completing = $state(false);
	let resetting = $state(false);
	let notesExpanded = $state(false);
	let addingNote = $state(false);
	let newNoteText = $state('');

	const startDate = $derived(new Date(weekStartDate));
	const blocked = $derived(isSubmissionBlocked(startDate, subtask.blockoutDay));
	const blockoutMsg = $derived(blocked ? getBlockoutMessage(startDate, subtask.blockoutDay) : '');

	const isCompleted = $derived(!!subtask.completedBy);
	const isLateCompleted = $derived(!!subtask.lateCompletedBy);
	const isForgotten = $derived(subtask.forgotten);
	// Admin-resolved = forgotten AND lateCompletedBy set (daysLate will be 0)
	const isAdminResolved = $derived(isForgotten && isLateCompleted);
	// Awaiting admin = forgotten but NOT yet resolved
	const isAwaitingAdmin = $derived(isForgotten && !isLateCompleted);
	const isResolved = $derived(isCompleted || isLateCompleted || isForgotten);

	const statusClass = $derived(
		isCompleted
			? 'completed'
			: isAdminResolved
				? 'admin-resolved'
				: isLateCompleted
					? 'late'
					: isAwaitingAdmin
						? 'forgotten'
						: blocked
							? 'blocked'
							: 'pending'
	);

	async function handleComplete() {
		completing = true;
		try {
			const res = await fetch(`/api/subtasks/${subtask._id}/complete`, { method: 'PATCH' });
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			completing = false;
		}
	}

	async function handleReset() {
		/*
		if (!confirm('Reset this subtask? All completion data will be cleared.')) {
			return;
		}
		*/
		
		resetting = true;
		try {
			const res = await fetch(`/api/admin/subtasks/${subtask._id}/reset`, { method: 'POST' });
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			resetting = false;
		}
	}

	async function handleFeedback(type: 'smile' | 'frown') {
		if (userVote === type) {
			// Toggle off - remove current vote
			const res = await fetch(`/api/subtasks/${subtask._id}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, action: 'remove' })
			});
			if (res.ok) {
				userVote = null;
			}
		} else if (userVote !== null) {
			// Switch vote - remove old, add new
			const oldType = userVote;
			await fetch(`/api/subtasks/${subtask._id}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: oldType, action: 'remove' })
			});
			const res = await fetch(`/api/subtasks/${subtask._id}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, action: 'add' })
			});
			if (res.ok) {
				userVote = type;
			}
		} else {
			// New vote
			const res = await fetch(`/api/subtasks/${subtask._id}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, action: 'add' })
			});
			if (res.ok) {
				userVote = type;
			}
		}
		await invalidateAll();
	}

	function toggleNotes() {
		notesExpanded = !notesExpanded;
	}

	async function addNote() {
		if (!newNoteText.trim()) return;

		addingNote = true;
		try {
			const res = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subtaskName: subtask.subtaskName,
					text: newNoteText.trim()
				})
			});

			if (res.ok) {
				await invalidateAll();
				newNoteText = '';
			}
		} finally {
			addingNote = false;
		}
	}

	async function deleteNote(index: number) {
		if (!confirm('Delete this tip?')) return;

		try {
			const res = await fetch('/api/notes', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subtaskName: subtask.subtaskName,
					noteIndex: index
				})
			});

			if (res.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to delete note:', err);
		}
	}
</script>

<div class="subtask-row {statusClass}">
	<div class="subtask-main">
		<div class="subtask-info">
			<span class="subtask-name">{subtask.subtaskName}</span>
			<button
				class="info-icon"
				onclick={toggleNotes}
				title={notesExpanded ? 'Hide tips' : 'Show tips'}
				aria-label="Toggle tips"
			>
				&#9432;
				{#if notes.length > 0}
					<span class="note-count">{notes.length}</span>
				{/if}
			</button>
			{#if isCompleted}
				<span class="badge badge-success">Done</span>
			{:else if isAdminResolved}
				<span class="badge badge-info">Accepted</span>
			{:else if isLateCompleted}
				<span class="badge badge-warning">{subtask.daysLate}d late</span>
			{:else if isAwaitingAdmin}
				<span class="badge badge-danger">Forgot</span>
			{:else if blocked}
				<span class="badge badge-danger">Locked</span>
			{/if}
		</div>

		<div class="subtask-actions">
			{#if !isResolved && !blocked && !readonly}
				<button class="btn btn-success btn-sm" onclick={handleComplete} disabled={completing}>
					{completing ? '...' : 'Done'}
				</button>
			{/if}

			{#if (isCompleted || isLateCompleted) && !readonly}
				<div class="feedback-btns">
					<button
						class="feedback-btn"
						class:active={userVote === 'smile'}
						onclick={() => handleFeedback('smile')}
						title={userVote === 'smile' ? 'Remove vote' : 'Good job'}
					>
						&#128578; {subtask.smiles || ''}
					</button>
					<button
						class="feedback-btn"
						class:active={userVote === 'frown'}
						onclick={() => handleFeedback('frown')}
						title={userVote === 'frown' ? 'Remove vote' : 'Needs work'}
					>
						&#128577; {subtask.frowns || ''}
					</button>
				</div>
			{/if}

			{#if isResolved}
				<button class="btn btn-danger btn-sm" onclick={handleReset} disabled={resetting}>
					{resetting ? 'Resetting...' : 'Reset'}
				</button>
			{/if}
		</div>
	</div>

	{#if isCompleted && subtask.completedBy}
		<div class="subtask-meta">
			Completed by {subtask.completedBy}
			{#if subtask.completedAt}
				&middot; {new Date(subtask.completedAt).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
			{/if}
		</div>
	{:else if isAdminResolved}
		<div class="subtask-meta info">
			{subtask.lateCompletedBy}{#if subtask.forgottenBy} (reported by {subtask.forgottenBy}){/if}
		</div>
	{:else if isLateCompleted && subtask.lateCompletedBy}
		<div class="subtask-meta warning">
			Late by {subtask.lateCompletedBy} ({subtask.daysLate} day{subtask.daysLate > 1 ? 's' : ''})
		</div>
	{:else if isAwaitingAdmin}
		<div class="subtask-meta danger">
			{#if subtask.forgottenBy}
				Marked forgot by {subtask.forgottenBy} &middot; Awaiting admin review
			{:else}
				Awaiting admin review
			{/if}
		</div>
	{:else if blocked}
		<div class="subtask-meta danger">{blockoutMsg}</div>
	{/if}

	{#if notesExpanded}
		<div class="subtask-notes">
			{#if notes.length > 0}
				{#each notes as note, index}
					<div class="note">
						<span class="note-icon">&#128221;</span>
						<span class="note-text">{note.text}</span>
						<button class="note-delete" onclick={() => deleteNote(index)} title="Delete tip">
							&times;
						</button>
					</div>
				{/each}
			{/if}

			<div class="add-note-section">
				<input
					type="text"
					bind:value={newNoteText}
					placeholder="Add a tip..."
					class="note-input"
					onkeydown={(e) => e.key === 'Enter' && addNote()}
				/>
				<button class="btn btn-primary btn-sm" onclick={addNote} disabled={addingNote || !newNoteText.trim()}>
					{addingNote ? '...' : 'Add'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.subtask-row {
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--color-border, #e2e8f0);
		transition: background 0.1s;
	}

	.subtask-row:last-child {
		border-bottom: none;
	}

	.subtask-row:hover {
		background: rgba(0, 0, 0, 0.015);
	}

	.subtask-row.completed {
		background: rgba(39, 174, 96, 0.04);
	}

	.subtask-row.late {
		background: rgba(230, 126, 34, 0.04);
	}

	.subtask-row.forgotten {
		background: rgba(231, 76, 60, 0.04);
	}

	.subtask-row.admin-resolved {
		background: rgba(52, 152, 219, 0.04);
	}

	.subtask-row.blocked {
		opacity: 0.6;
	}

	.subtask-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.subtask-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.subtask-name {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.subtask-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.subtask-meta {
		font-size: 0.78rem;
		color: var(--color-text-muted, #718096);
		margin-top: 0.2rem;
	}

	.subtask-meta.warning {
		color: var(--color-warning, #e67e22);
	}

	.subtask-meta.danger {
		color: var(--color-danger, #e74c3c);
	}

	.subtask-meta.info {
		color: var(--color-info, #3498db);
	}

	.feedback-btns {
		display: flex;
		gap: 0.25rem;
	}

	.feedback-btn {
		background: none;
		border: 1px solid var(--color-border, #e2e8f0);
		border-radius: 999px;
		padding: 0.15rem 0.4rem;
		cursor: pointer;
		font-size: 0.75rem;
		transition: background 0.1s;
	}

	.feedback-btn:hover {
		background: var(--color-bg, #f5f5f5);
	}

	.feedback-btn.active {
		background: var(--color-primary, #2c3e50);
		color: white;
		border-color: var(--color-primary, #2c3e50);
	}

	.info-icon {
		background: none;
		border: 1px solid var(--color-border, #e2e8f0);
		border-radius: 50%;
		width: 1.3rem;
		height: 1.3rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 0.75rem;
		color: var(--color-text-muted, #718096);
		transition: all 0.15s;
		padding: 0;
		flex-shrink: 0;
		position: relative;
	}

	.info-icon:hover {
		background: var(--color-bg, #f5f5f5);
		border-color: var(--color-primary, #2c3e50);
		color: var(--color-primary, #2c3e50);
	}

	.note-count {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--color-danger, #e74c3c);
		color: white;
		border-radius: 50%;
		width: 14px;
		height: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 600;
		line-height: 1;
	}

	.subtask-notes {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border, #e2e8f0);
	}

	.note {
		font-size: 0.8rem;
		color: var(--color-text, #2c3e50);
		padding: 0.4rem 0;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.note-icon {
		flex-shrink: 0;
	}

	.note-text {
		flex: 1;
	}

	.note-delete {
		background: none;
		border: none;
		color: var(--color-danger, #e74c3c);
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
		padding: 0 0.25rem;
		opacity: 0.5;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.note-delete:hover {
		opacity: 1;
	}

	.add-note-section {
		margin-top: 0.5rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.note-input {
		flex: 1;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--color-border, #e2e8f0);
		border-radius: 4px;
		font-size: 0.85rem;
		background: white;
	}

	.note-input:focus {
		outline: none;
		border-color: var(--color-accent, #3498db);
	}
</style>
