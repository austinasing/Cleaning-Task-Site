<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	const tasks = $derived(data.tasks || []);

	const isPrivileged = $derived(
		$currentUser?.role === 'admin' || $currentUser?.role === 'accountant'
	);
	const userName = $derived($currentUser?.name ?? '');

	// Create form state
	let showCreate = $state(false);
	let newDescription = $state('');
	let newValue = $state(5);
	let creating = $state(false);
	let errorMsg = $state('');

	const availableTasks = $derived(tasks.filter((t: any) => t.status === 'available'));
	const pendingTasks = $derived(tasks.filter((t: any) => t.status === 'pending'));
	const completedTasks = $derived(tasks.filter((t: any) => t.status === 'completed'));

	async function createTask(e: Event) {
		e.preventDefault();
		creating = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/extra-tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskDescription: newDescription, value: newValue })
			});

			if (!res.ok) {
				const d = await res.json();
				errorMsg = d.error || 'Failed to create task';
				return;
			}

			newDescription = '';
			newValue = 5;
			showCreate = false;
			await invalidateAll();
		} finally {
			creating = false;
		}
	}

	async function claimTask(taskId: string) {
		await fetch(`/api/extra-tasks/${taskId}`, { method: 'PATCH' });
		await invalidateAll();
	}

	async function confirmComplete(taskId: string) {
		await fetch(`/api/extra-tasks/${taskId}/complete`, { method: 'POST' });
		await invalidateAll();
	}

	async function deleteTask(taskId: string) {
		await fetch(`/api/extra-tasks/${taskId}`, { method: 'DELETE' });
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Extra Tasks</title>
</svelte:head>

<div class="page-header">
	<h1>Extra Tasks</h1>
	<p>Claim tasks for extra credit towards your hallway balance</p>
</div>

<button class="btn btn-primary create-btn" onclick={() => (showCreate = !showCreate)}>
	{showCreate ? 'Cancel' : 'Create Task'}
</button>

{#if showCreate}
	<form class="card create-form" onsubmit={createTask}>
		{#if errorMsg}
			<div class="error-message">{errorMsg}</div>
		{/if}
		<div class="form-group">
			<label for="task-desc">Description</label>
			<input id="task-desc" type="text" bind:value={newDescription} required placeholder="e.g., Clean the oven" />
		</div>
		<div class="form-group">
			<label for="task-value">Value (EUR)</label>
			<input id="task-value" type="number" bind:value={newValue} required min="1" step="1" />
		</div>
		<button class="btn btn-primary" type="submit" disabled={creating}>
			{creating ? 'Creating...' : 'Create'}
		</button>
	</form>
{/if}

<!-- Available Tasks -->
{#if availableTasks.length > 0}
	<h2 class="section-title">Available</h2>
	<div class="task-list">
		{#each availableTasks as task (task._id)}
			<div class="card task-card available">
				<div class="task-info">
					<span class="task-desc">{task.taskDescription}</span>
					<span class="task-value">&euro;{task.value}</span>
				</div>
				<div class="task-meta">Created by {task.createdBy}</div>
				<div class="task-actions">
					<button class="btn btn-success btn-sm" onclick={() => claimTask(task._id)}>
						Claim
					</button>
					{#if task.createdBy === userName || isPrivileged}
						<button class="btn btn-outline btn-sm" onclick={() => deleteTask(task._id)}>
							Delete
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Pending Tasks -->
{#if pendingTasks.length > 0}
	<h2 class="section-title">Pending Confirmation</h2>
	<div class="task-list">
		{#each pendingTasks as task (task._id)}
			<div class="card task-card pending">
				<div class="task-info">
					<span class="task-desc">{task.taskDescription}</span>
					<span class="task-value">&euro;{task.value}</span>
				</div>
				<div class="task-meta">
					Claimed by {task.completedBy}
				</div>
				<div class="task-actions">
					{#if isPrivileged}
						<button class="btn btn-success btn-sm" onclick={() => confirmComplete(task._id)}>
							Confirm Done
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<!-- Completed Tasks -->
{#if completedTasks.length > 0}
	<h2 class="section-title">Completed</h2>
	<div class="task-list">
		{#each completedTasks as task (task._id)}
			<div class="card task-card completed">
				<div class="task-info">
					<span class="task-desc">{task.taskDescription}</span>
					<span class="task-value">&euro;{task.value}</span>
				</div>
				<div class="task-meta">Done by {task.completedBy}</div>
			</div>
		{/each}
	</div>
{/if}

{#if tasks.length === 0}
	<p class="empty-state">No extra tasks yet. Create one to get started!</p>
{/if}

<style>
	.create-btn {
		margin-bottom: 1rem;
	}

	.create-form {
		padding: 1.25rem;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		font-size: 1rem;
		color: var(--color-primary, #2c3e50);
		margin: 1.25rem 0 0.5rem;
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.task-card {
		padding: 0.75rem 1rem;
	}

	.task-card.available {
		border-left: 3px solid var(--color-success, #27ae60);
	}

	.task-card.pending {
		border-left: 3px solid var(--color-warning, #e67e22);
	}

	.task-card.completed {
		border-left: 3px solid var(--color-text-muted, #718096);
		opacity: 0.7;
	}

	.task-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.task-desc {
		font-weight: 500;
		font-size: 0.95rem;
	}

	.task-value {
		font-weight: 700;
		color: var(--color-success, #27ae60);
		font-size: 0.95rem;
	}

	.task-meta {
		font-size: 0.8rem;
		color: var(--color-text-muted, #718096);
		margin: 0.2rem 0;
	}

	.task-actions {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.4rem;
	}

	.empty-state {
		text-align: center;
		color: var(--color-text-muted, #718096);
		padding: 3rem;
	}
</style>
