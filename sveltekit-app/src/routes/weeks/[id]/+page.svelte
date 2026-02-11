<script lang="ts">
	import WeekNavigator from '$lib/components/WeekNavigator.svelte';
	import TaskGroup from '$lib/components/TaskGroup.svelte';
	import { currentUser } from '$lib/stores/auth';

	let { data } = $props();

	const week = $derived(data.week);
	const taskGroups = $derived(data.taskGroups || []);
	const allWeeks = $derived(data.allWeeks || []);

	const userName = $derived($currentUser?.name ?? '');
	const isCompleted = $derived(week?.status === 'completed');
	const isAdmin = $derived($currentUser?.role === 'admin' || $currentUser?.role === 'accountant');

	const myGroup = $derived(
		taskGroups.find((g: any) =>
			g.members.some((m: any) => m.name === userName)
		)
	);
	const otherGroups = $derived(
		taskGroups.filter((g: any) => g !== myGroup)
	);
</script>

<svelte:head>
	<title>Week {week?.weekNumber ?? ''}, {week?.year ?? ''}</title>
</svelte:head>

{#if week && allWeeks.length > 0}
	<WeekNavigator {allWeeks} currentWeekId={String(week._id)} />

	{#if isCompleted}
		<div class="week-status-banner">
			This week has been completed. Tasks are read-only.
		</div>
	{/if}

	<div class="task-groups-container">
		{#if myGroup}
			<div class="section-label">Your Task</div>
			<TaskGroup
				taskGroup={myGroup}
				weekStartDate={week.startDate}
				expanded={true}
				readonly={isCompleted}
				{isAdmin}
			/>
		{/if}

		{#if otherGroups.length > 0}
			{#if myGroup}
				<div class="section-label other">Other Tasks</div>
			{/if}
			{#each otherGroups as taskGroup (taskGroup._id)}
				<TaskGroup
					{taskGroup}
					weekStartDate={week.startDate}
					expanded={false}
					readonly={isCompleted}
					{isAdmin}
				/>
			{/each}
		{/if}
	</div>
{:else}
	<div class="no-week-message">
		<h2>Week Not Found</h2>
		<p><a href="/">Back to current week</a></p>
	</div>
{/if}

<style>
	.task-groups-container {
		display: flex;
		flex-direction: column;
	}

	.section-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted, #718096);
		margin-bottom: 0.5rem;
	}

	.section-label.other {
		margin-top: 1rem;
	}

	.week-status-banner {
		background: var(--color-info-bg, #d6eaf8);
		color: var(--color-info, #3498db);
		padding: 0.6rem 1rem;
		border-radius: var(--radius, 8px);
		text-align: center;
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.no-week-message {
		text-align: center;
		padding: 4rem 1rem;
		background: white;
		border-radius: var(--radius-lg, 12px);
	}

	.no-week-message h2 {
		color: var(--color-primary, #2c3e50);
		margin-bottom: 0.5rem;
	}

	.no-week-message a {
		color: var(--color-accent, #3498db);
	}
</style>
