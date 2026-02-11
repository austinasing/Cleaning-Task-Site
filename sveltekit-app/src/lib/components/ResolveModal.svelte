<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	interface IncompleteSubtask {
		_id: string;
		subtaskName: string;
	}

	let {
		taskGroupDisplayName,
		incompleteSubtasks,
		onclose
	}: {
		taskGroupDisplayName: string;
		incompleteSubtasks: IncompleteSubtask[];
		onclose: () => void;
	} = $props();

	let selected = $state<Set<string>>(new Set());
	let daysLate = $state(1);
	let mode = $state<'select' | 'late' | 'forgot'>('select');
	let submitting = $state(false);
	let errorMsg = $state('');

	const finePreview = $derived(daysLate * 5);
	const hasSelection = $derived(selected.size > 0);

	function toggleSubtask(id: string) {
		selected = new Set(selected);
		if (selected.has(id)) {
			selected.delete(id);
		} else {
			selected.add(id);
		}
	}

	function selectAll() {
		selected = new Set(incompleteSubtasks.map((s) => s._id));
	}

	async function submitLate() {
		if (!hasSelection) return;
		submitting = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/subtasks/late', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subtaskIds: Array.from(selected),
					daysLate
				})
			});

			if (!res.ok) {
				const data = await res.json();
				errorMsg = data.error || 'Failed to submit';
				return;
			}

			await invalidateAll();
			onclose();
		} finally {
			submitting = false;
		}
	}

	async function submitForgot() {
		if (!hasSelection) return;
		submitting = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/subtasks/forgot', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subtaskIds: Array.from(selected)
				})
			});

			if (!res.ok) {
				const data = await res.json();
				errorMsg = data.error || 'Failed to submit';
				return;
			}

			await invalidateAll();
			onclose();
		} finally {
			submitting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" role="dialog" aria-modal="true" tabindex="-1" onclick={handleBackdropClick} onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
	<div class="modal">
		<h2>Resolve Incomplete Tasks</h2>
		<p class="modal-subtitle">{taskGroupDisplayName}</p>

		{#if errorMsg}
			<div class="error-message">{errorMsg}</div>
		{/if}

		{#if mode === 'select'}
			<p class="instructions">Select the subtasks you want to resolve:</p>

			<div class="checklist">
				{#each incompleteSubtasks as subtask}
					<label class="check-item">
						<input
							type="checkbox"
							checked={selected.has(subtask._id)}
							onchange={() => toggleSubtask(subtask._id)}
						/>
						<span>{subtask.subtaskName}</span>
					</label>
				{/each}
			</div>

			<button class="btn btn-outline btn-sm select-all-btn" onclick={selectAll}>
				Select All
			</button>

			<div class="modal-actions">
				<button class="btn btn-outline" onclick={onclose}>Cancel</button>
				<button
					class="btn btn-warning"
					disabled={!hasSelection}
					onclick={() => (mode = 'late')}
				>
					Submit as Late
				</button>
				<button
					class="btn btn-danger"
					disabled={!hasSelection}
					onclick={() => (mode = 'forgot')}
				>
					Mark as Forgot
				</button>
			</div>

		{:else if mode === 'late'}
			<p class="instructions">
				How many days late? ({selected.size} subtask{selected.size > 1 ? 's' : ''} selected)
			</p>

			<div class="days-selector">
				{#each [1, 2, 3] as d}
					<button
						class="day-btn"
						class:active={daysLate === d}
						onclick={() => (daysLate = d)}
					>
						{d} day{d > 1 ? 's' : ''}
					</button>
				{/each}
			</div>

			<div class="fine-preview">
				Fine: <strong>&euro;{finePreview}</strong> per task group
			</div>

			<div class="modal-actions">
				<button class="btn btn-outline" onclick={() => (mode = 'select')}>Back</button>
				<button class="btn btn-warning" onclick={submitLate} disabled={submitting}>
					{submitting ? 'Submitting...' : `Confirm Late (€${finePreview})`}
				</button>
			</div>

		{:else if mode === 'forgot'}
			<p class="instructions">
				Mark {selected.size} subtask{selected.size > 1 ? 's' : ''} as forgotten?
			</p>
			<p class="forgot-note">
				No fine will be applied. These will be sent to an admin for review.
			</p>

			<div class="modal-actions">
				<button class="btn btn-outline" onclick={() => (mode = 'select')}>Back</button>
				<button class="btn btn-danger" onclick={submitForgot} disabled={submitting}>
					{submitting ? 'Submitting...' : 'Confirm Forgot'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-subtitle {
		color: var(--color-text-muted, #718096);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.instructions {
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.checklist {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.check-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.1s;
	}

	.check-item:hover {
		background: var(--color-bg, #f5f5f5);
	}

	.check-item input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-primary, #2c3e50);
	}

	.select-all-btn {
		margin-bottom: 0.5rem;
	}

	.days-selector {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.day-btn {
		flex: 1;
		padding: 0.6rem;
		border: 2px solid var(--color-border, #e2e8f0);
		border-radius: var(--radius, 8px);
		background: white;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.15s;
	}

	.day-btn.active {
		border-color: var(--color-warning, #e67e22);
		background: var(--color-warning-bg, #ffeaa7);
		color: #856404;
	}

	.fine-preview {
		padding: 0.75rem;
		background: var(--color-warning-bg, #ffeaa7);
		border-radius: var(--radius, 8px);
		font-size: 0.9rem;
		text-align: center;
	}

	.forgot-note {
		padding: 0.75rem;
		background: var(--color-info-bg, #d6eaf8);
		border-radius: var(--radius, 8px);
		font-size: 0.85rem;
		color: var(--color-info, #3498db);
	}
</style>
