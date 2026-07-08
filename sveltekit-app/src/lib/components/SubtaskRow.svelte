<script module lang="ts">
	// Shared across every SubtaskRow so confetti cache-bust keys are globally
	// unique. A per-instance counter would collide between rows (each starting
	// at 0), making the browser serve an already-finished animation as a still.
	let confettiSeq = 0;
</script>

<script lang="ts">
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

	let {
		subtask,
		weekStartDate,
		readonly = false,
		userEmojiMap = {}
	}: {
		subtask: SubtaskData;
		weekStartDate: string;
		readonly?: boolean;
		userEmojiMap?: Record<string, string>;
	} = $props();

	let completing = $state(false);
	let resetting = $state(false);
	let showConfetti = $state(false);
	let confettiKey = $state(0);
	let confettiX = $state(0);
	let confettiY = $state(0);

	const startDate = $derived(new Date(weekStartDate));
	const blocked = $derived(isSubmissionBlocked(startDate, subtask.blockoutDay));

	const isCompleted = $derived(!!subtask.completedBy);
	const isForgotten = $derived(subtask.forgotten);
	const isLateCompleted = $derived(!!subtask.lateCompletedBy && !isForgotten);
	const isResolved = $derived(isCompleted || isLateCompleted || isForgotten);

	// Due day label: the day before the lockout fires
	// blockoutDay 1 → locked Tue → due Mon
	// blockoutDay 3 → locked Thu → due Wed
	// blockoutDay 5 → locked Sat → due Fri
	const dueDay = $derived(
		subtask.blockoutDay === 1 ? 'M' :
		subtask.blockoutDay === 3 ? 'W' :
		subtask.blockoutDay === 5 ? 'F' : ''
	);

	const statusClass = $derived(
		isCompleted
			? 'completed'
			: isForgotten
				? 'completed'
				: isLateCompleted
					? 'late'
					: blocked
						? 'blocked'
						: 'pending'
	);

	async function handleComplete(e: MouseEvent) {
		completing = true;
		// Anchor the confetti to the button's center at click time so it survives
		// the re-render that swaps Done → Reset once the row resolves.
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		confettiX = rect.left + rect.width / 2;
		confettiY = rect.top + rect.height / 2;
		confettiKey = ++confettiSeq;
		showConfetti = true;
		// Animation is ~440ms (10 frames @ 25fps); hide shortly after it finishes.
		setTimeout(() => { showConfetti = false; }, 700);
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
		const res = await fetch(`/api/subtasks/${subtask._id}/feedback`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ type })
		});
		if (res.ok) {
			await invalidateAll();
		}
	}

	const currentUserName = $derived($currentUser?.name ?? '');
	const userVote = $derived(
		subtask.smilesBy?.includes(currentUserName) ? ('smile' as const) :
		subtask.frownsBy?.includes(currentUserName) ? ('frown' as const) :
		null
	);
</script>

{#if showConfetti}
	<img
		src="/pics/confetti.webp?k={confettiKey}"
		class="confetti-anim"
		style="left:{confettiX}px; top:{confettiY}px;"
		alt=""
		aria-hidden="true"
	/>
{/if}

<div class="subtask-row {statusClass}">
	<div class="subtask-main">
		<div class="subtask-info">
			{#if dueDay}
				<span class="due-day-badge">{dueDay}</span>
			{/if}
			<span class="subtask-name">{subtask.subtaskName}</span>
			{#if isCompleted}
				<span class="badge badge-success">Done</span>
				{#if subtask.completedBy}
					<span class="effected-by">{userEmojiMap[subtask.completedBy] ?? ''} {subtask.completedBy}</span>
				{/if}
			{:else if isForgotten}
				<span class="badge badge-success">Done</span>
			{:else if isLateCompleted}
				<span class="badge badge-warning">{subtask.daysLate}d late</span>
				{#if subtask.lateCompletedBy}
					<span class="effected-by">{userEmojiMap[subtask.lateCompletedBy] ?? ''} {subtask.lateCompletedBy}</span>
				{/if}
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

			{#if (isCompleted || isLateCompleted || isForgotten) && !readonly}
				<div class="feedback-btns">
					<button
						class="feedback-btn"
						class:active={userVote === 'smile'}
						onclick={() => handleFeedback('smile')}
						title={userVote === 'smile' ? 'Remove vote' : 'Good job'}
					>
						&#128578; {subtask.smilesBy?.length || ''}
					</button>
					<button
						class="feedback-btn"
						class:active={userVote === 'frown'}
						onclick={() => handleFeedback('frown')}
						title={userVote === 'frown' ? 'Remove vote' : 'Needs work'}
					>
						&#128577; {subtask.frownsBy?.length || ''}
					</button>
				</div>
			{/if}

			{#if isResolved}
				<button
					class="btn-undo"
					onclick={handleReset}
					disabled={resetting}
					title="Reset"
					aria-label="Reset"
				>
					&#8634;
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.subtask-row {
		padding: 0.5rem 0.5rem 0.5rem 0.2rem;
		border-bottom: 1px solid #808080;
	}

	.subtask-row:last-child {
		border-bottom: none;
	}

	.subtask-row.completed {
		background: #c0c0c0;
	}

	.subtask-row.late {
		background: #c0c0c0;
	}



	.subtask-row.pending {
		background: #fff;
	}

	.subtask-row.blocked {
		background: #fff;
		opacity: 0.5;
	}

	.subtask-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.subtask-info {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: 1;
		min-width: 0;
		flex-wrap: wrap;
	}

	.due-day-badge {
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.1rem 0.2rem 0rem 0.2rem;
		border: 1px solid #808080;
		background: #e0e0e0;
		color: #000;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.subtask-name {
		font-size: 0.9rem;
		font-weight: 400;
	}

	.effected-by {
		font-size: 0.8rem;
		color: #444;
	}

	.subtask-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	/* Fixed overlay anchored to the button's click-time center. Fixed positioning
	   keeps it out of document flow, so it never shifts layout or grows the
	   scroll area, and sits above all other content. */
	.confetti-anim {
		position: fixed;
		transform: translate(-50%, -50%);
		width: 240px;
		height: 240px;
		z-index: 9999;
		pointer-events: none;
	}

	.feedback-btns {
		display: flex;
		gap: 0.2rem;
	}

	.feedback-btn {
		background: #c0c0c0;
		border: 1px outset #ddd;
		padding: 0.1rem 0.35rem;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.feedback-btn:active {
		border-style: inset;
	}

	.feedback-btn.active {
		border-style: inset;
		background: #a0a0a0;
	}

	.btn-undo {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.2rem;
		height: 1.2rem;
		padding: 0;
		background: #c0c0c0;
		color: #c00000;
		border: 2px outset #e0e0e0;
		font-size: 1rem;
		line-height: 1;
		font-weight: 700;
		cursor: pointer;
	}

	.btn-undo:active:not(:disabled) {
		border-style: inset;
		background: #a0a0a0;
		box-shadow: none;
	}

	.btn-undo:disabled {
		cursor: default;
		opacity: 0.8;
	}

</style>
