<script lang="ts">
	import SubtaskRow from './SubtaskRow.svelte';
	import ResolveModal from './ResolveModal.svelte';
	import { isSubmissionBlocked } from '$lib/utils/blockout';
	import { invalidateAll } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';

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
		smilesBy: string[];
		frownsBy: string[];
	}

	interface NoteData {
		_id: string;
		text: string;
		addedBy: string;
		addedAt: string;
	}

	interface TaskGroupData {
		_id: string;
		name: string;
		displayName: string;
		members: Array<{ userId: string; name: string }>;
		notes: NoteData[];
		subtasks: SubtaskData[];
	}

	let {
		taskGroup,
		weekStartDate,
		expanded = false,
		readonly = false,
		completedWeek = false,
		userEmojiMap = {}
	}: {
		taskGroup: TaskGroupData;
		weekStartDate: string;
		expanded?: boolean;
		readonly?: boolean;
		completedWeek?: boolean;
		userEmojiMap?: Record<string, string>;
	} = $props();

	let isExpanded = $state(false);
	let showResolveModal = $state(false);
	let notesExpanded = $state(false);
	let addingNote = $state(false);
	let newNoteText = $state('');
	// Sync expanded prop to local state
	$effect(() => {
		isExpanded = expanded;
	});

	const subtasks = $derived(taskGroup.subtasks || []);
	const completedCount = $derived(
		subtasks.filter((s) => s.completedBy || s.lateCompletedBy || s.forgotten).length
	);
	const totalCount = $derived(subtasks.length);
	const allDone = $derived(completedCount === totalCount && totalCount > 0);

	const startDate = $derived(new Date(weekStartDate));

	const gifName = $derived(taskGroup.name.replace(/_(fri|mon|front|back)$/, ''));

	// Incomplete subtasks that are past their blockout time (eligible for resolve modal)
	const incompleteBlockedSubtasks = $derived(
		subtasks.filter(
			(s) =>
				!s.completedBy &&
				!s.lateCompletedBy &&
				!s.forgotten &&
				isSubmissionBlocked(startDate, s.blockoutDay)
		)
	);

	const hasIncompleteBlocked = $derived(incompleteBlockedSubtasks.length > 0);


	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	function toggleNotes() {
		notesExpanded = !notesExpanded;
		if (notesExpanded) {
			isExpanded = true;
		}
	}

	async function addNote() {
		if (!newNoteText.trim()) return;

		addingNote = true;
		try {
			const res = await fetch('/api/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskGroupName: taskGroup.name,
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

	const currentUserName = $derived($currentUser?.name ?? '');
	const isPrivileged = $derived(
		$currentUser?.role === 'admin' || $currentUser?.role === 'accountant'
	);

	function canDeleteNote(note: NoteData) {
		return note.addedBy === currentUserName || isPrivileged;
	}

	async function deleteNote(noteId: string) {
		if (!confirm('Delete this tip?')) return;

		try {
			const res = await fetch('/api/notes', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ noteId })
			});

			if (res.ok) {
				await invalidateAll();
			}
		} catch (err) {
			console.error('Failed to delete note:', err);
		}
	}

</script>
<div class="task-group card" class:all-done={allDone}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="task-group-header" role="button" tabindex="0" onclick={toggleExpand} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(); }}>
		<div class="header-left">
			<div class="header-icon">
				<img src="/pics/task_gifs/{gifName}.gif" alt="" />
			</div>
			<div class="header-info">
				<h3 class="group-name">
					{taskGroup.displayName}
					<button
						class="info-icon"
						onclick={(e) => { e.stopPropagation(); toggleNotes(); }}
						title={notesExpanded ? 'Hide tips' : 'Show tips'}
						aria-label="Toggle tips"
					>&#9432;</button>
				</h3>
				<span class="members">
					{taskGroup.members.map((m) => m.name).join(' & ') || 'Unassigned'}
				</span>
			</div>
		</div>
		<div class="header-right">
			{#if hasIncompleteBlocked}
				<span class="locked-alert" title="Some tasks are locked and incomplete">&#10071;</span>
			{/if}
			<span class="progress" class:complete={allDone}>
				{completedCount}/{totalCount}
			</span>
		</div>
	</div>

	{#if isExpanded}
		<div class="task-group-body">
			{#if notesExpanded}
				<div class="group-notes">
					{#if taskGroup.notes.length > 0}
						{#each taskGroup.notes as note}
							<div class="note">
								<span class="note-text">{note.text}</span>
								{#if canDeleteNote(note)}
									<button class="note-delete" onclick={() => deleteNote(note._id)} title="Delete tip">
										&times;
									</button>
								{/if}
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

			{#if subtasks.length === 0}
				<div class="no-subtasks">No subtasks for this group</div>
			{:else}
				{#each subtasks as subtask (subtask._id)}
					<SubtaskRow
						{subtask}
						{weekStartDate}
						{readonly}
						{userEmojiMap}
					/>
				{/each}
			{/if}

			{#if hasIncompleteBlocked && (!readonly || completedWeek)}
				<div class="resolve-section">
					<button class="btn btn-warning btn-sm" onclick={() => (showResolveModal = true)}>
						Resolve Incomplete Tasks ({incompleteBlockedSubtasks.length})
					</button>
				</div>
			{/if}

		</div>
	{/if}
</div>

{#if showResolveModal}
	<ResolveModal
		taskGroupDisplayName={taskGroup.displayName}
		incompleteSubtasks={incompleteBlockedSubtasks.map((s) => ({
			_id: s._id,
			subtaskName: s.subtaskName
		}))}
		onclose={() => (showResolveModal = false)}
	/>
{/if}

<style>
	.task-group {
		margin-bottom: 0rem;
	}

	.task-group.all-done {
		border-left: 3px solid var(--color-success, #008000);
	}

	.task-group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		user-select: none;
		background: #c0c0c0;
	}

	.header:hover {
		background: #d0d0d0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		flex-shrink: 0;
	}

	.header-icon img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.header-info {
		display: flex;
		flex-direction: column;
	}

	.group-name {
		font-size: 0.95rem;
		font-weight: 700;
		color: #000;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.info-icon {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 400;
		color: #666;
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		line-height: 1;
	}

	.info-icon:hover {
		color: #000;
	}

	.members {
		font-size: 0.8rem;
		color: #444;
	}

	.locked-alert {
		font-size: 1rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.progress {
		font-size: 0.85rem;
		font-weight: 700;
		color: #444;
		padding: 0.15rem 0.5rem;
		border: 1px solid #808080;
	}

	.progress.complete {
		color: var(--color-success, #008000);
		border-color: var(--color-success, #008000);
	}

	.task-group-body {
		border-top: 1px solid #808080;
	}

	.no-subtasks {
		padding: 0.75rem;
		text-align: center;
		color: #444;
		font-size: 0.9rem;
	}

	.resolve-section {
		padding: 0.5rem 0.75rem;
		border-top: 1px solid #808080;
		display: flex;
		justify-content: center;
	}

	.group-notes {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #808080;
		background: #e8e8e8;
	}

	.note {
		font-size: 0.8rem;
		color: #000;
		padding: 0.3rem 0;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.note-text {
		flex: 1;
	}

	.note-delete {
		background: none;
		border: none;
		color: #cc0000;
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
		padding: 0 0.25rem;
		opacity: 0.6;
		flex-shrink: 0;
	}

	.note-delete:hover {
		opacity: 1;
	}

	.add-note-section {
		margin-top: 0.4rem;
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.note-input {
		flex: 1;
		padding: 0.3rem 0.5rem;
		border: 2px inset #ddd;
		font-size: 0.85rem;
		background: white;
		font-family: inherit;
	}

	.note-input:focus {
		outline: 1px dotted #000;
	}

</style>
