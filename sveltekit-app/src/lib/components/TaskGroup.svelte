<script lang="ts">
	import SubtaskRow from './SubtaskRow.svelte';
	import ResolveModal from './ResolveModal.svelte';
	import { isSubmissionBlocked } from '$lib/utils/blockout';
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

	interface TaskGroupData {
		_id: string;
		name: string;
		displayName: string;
		members: Array<{ userId: string; name: string }>;
		notes: Record<string, Array<{ text: string; addedBy: string; addedAt: string }>>;
		subtasks: SubtaskData[];
	}

	let {
		taskGroup,
		weekStartDate,
		expanded = false,
		readonly = false,
		isAdmin = false
	}: {
		taskGroup: TaskGroupData;
		weekStartDate: string;
		expanded?: boolean;
		readonly?: boolean;
		isAdmin?: boolean;
	} = $props();

	let isExpanded = $state(false);
	let showResolveModal = $state(false);
	let resolvingForgotten = $state(false);

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

	// Forgotten subtasks awaiting admin resolution (forgotten=true, lateCompletedBy=null)
	const awaitingAdminSubtasks = $derived(
		subtasks.filter((s) => s.forgotten && !s.lateCompletedBy)
	);

	const hasAwaitingAdmin = $derived(awaitingAdminSubtasks.length > 0);

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	async function handleAdminResolve() {
		if (!hasAwaitingAdmin) return;
		resolvingForgotten = true;
		try {
			const res = await fetch('/api/admin/forgot', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subtaskIds: awaitingAdminSubtasks.map((s) => s._id)
				})
			});
			if (res.ok) {
				await invalidateAll();
			}
		} finally {
			resolvingForgotten = false;
		}
	}
</script>
<div class="task-group card" class:all-done={allDone}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="task-group-header" role="button" tabindex="0" onclick={toggleExpand} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(); }}>
		<div class="header-left">
			<span class="expand-icon">{isExpanded ? '&#9660;' : '&#9654;'}</span>
			<div class="header-info">
				<h3 class="group-name">{taskGroup.displayName}</h3>
				<span class="members">
					{taskGroup.members.map((m) => m.name).join(' & ') || 'Unassigned'}
				</span>
			</div>
		</div>
		<div class="header-right">
			<span class="progress" class:complete={allDone}>
				{completedCount}/{totalCount}
			</span>
		</div>
	</div>

	{#if isExpanded}
		<div class="task-group-body">
			{#if subtasks.length === 0}
				<div class="no-subtasks">No subtasks for this group</div>
			{:else}
				{#each subtasks as subtask (subtask._id)}
					<SubtaskRow
						{subtask}
						{weekStartDate}
						notes={taskGroup.notes?.[subtask.subtaskName] || []}
						{readonly}
					/>
				{/each}
			{/if}

			{#if hasIncompleteBlocked && !readonly}
				<div class="resolve-section">
					<button class="btn btn-warning btn-sm" onclick={() => (showResolveModal = true)}>
						Resolve Incomplete Tasks ({incompleteBlockedSubtasks.length})
					</button>
				</div>
			{/if}

			{#if isAdmin && hasAwaitingAdmin}
				<div class="resolve-section admin-resolve">
					<button
						class="btn btn-info btn-sm"
						onclick={handleAdminResolve}
						disabled={resolvingForgotten}
					>
						{resolvingForgotten ? 'Accepting...' : `Accept All Forgot (${awaitingAdminSubtasks.length})`}
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
		overflow: hidden;
		margin-bottom: 1rem;
	}

	.task-group.all-done {
		border-color: var(--color-success, #27ae60);
		border-left: 3px solid var(--color-success, #27ae60);
	}

	.task-group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		cursor: pointer;
		user-select: none;
		transition: background 0.1s;
	}

	.task-group-header:hover {
		background: rgba(0, 0, 0, 0.02);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.expand-icon {
		font-size: 0.7rem;
		color: var(--color-text-muted, #718096);
		width: 1rem;
		text-align: center;
	}

	.header-info {
		display: flex;
		flex-direction: column;
	}

	.group-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-primary, #2c3e50);
	}

	.members {
		font-size: 0.8rem;
		color: var(--color-text-muted, #718096);
	}

	.progress {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-muted, #718096);
		background: var(--color-bg, #f5f5f5);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
	}

	.progress.complete {
		background: var(--color-success-bg, #d4edda);
		color: var(--color-success, #27ae60);
	}

	.task-group-body {
		border-top: 1px solid var(--color-border, #e2e8f0);
	}

	.no-subtasks {
		padding: 1rem;
		text-align: center;
		color: var(--color-text-muted, #718096);
		font-size: 0.9rem;
	}

	.resolve-section {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--color-border, #e2e8f0);
		display: flex;
		justify-content: center;
	}

	.resolve-section.admin-resolve {
		background: rgba(52, 152, 219, 0.05);
	}
</style>
