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
					Forgot to Submit
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
						{d} day{d > 1 ? 's' : ''} | &euro;{d * 5}
					</button>
				{/each}
			</div>

			<div class="modal-actions">
				<button class="btn btn-outline" onclick={() => (mode = 'select')}>Back</button>
				<button class="btn btn-warning" onclick={submitLate} disabled={submitting}>
					{submitting ? 'Submitting...' : `Confirm Late (€${daysLate * 5})`}
				</button>
			</div>

		{:else if mode === 'forgot'}
			<p class="instructions">
				Forget to submit {selected.size} subtask{selected.size > 1 ? 's' : ''} completed on time?
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
		color: #444;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.instructions {
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.checklist {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	.check-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.4rem;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.check-item:hover {
		background: #d0d0d0;
	}

	.check-item input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
	}

	.select-all-btn {
		margin-bottom: 0.5rem;
	}

	.days-selector {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}

	.day-btn {
		flex: 1;
		padding: 0.5rem;
		border: 2px outset #ddd;
		background: #c0c0c0;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 400;
		font-family: inherit;
	}

	.day-btn:active {
		border-style: inset;
	}

	.day-btn.active {
		border-style: inset;
		background: #a0a0a0;
		font-weight: 700;
	}


</style>
