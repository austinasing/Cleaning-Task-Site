<script lang="ts">
	import WeekNavigator from '$lib/components/WeekNavigator.svelte';
	import TaskGroup from '$lib/components/TaskGroup.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { currentUser } from '$lib/stores/auth';

	let { data } = $props();

	const week = $derived(data.week);
	const taskGroups = $derived(data.taskGroups || []);
	const allWeeks = $derived(data.allWeeks || []);

	const userName = $derived($currentUser?.name ?? '');
	const isCompleted = $derived(week?.status === 'completed');

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
	<SiteHeader activePage="tasks" />

	<WeekNavigator {allWeeks} currentWeekId={String(week._id)} />

	{#if isCompleted}
		<div class="week-status-banner">
			Completed
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
				completedWeek={isCompleted}
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
					completedWeek={isCompleted}
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
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #000;
		background: #a0a0a0;
		padding: 0.2rem 0.5rem;
		margin-bottom: 0rem;
		border: 2px inset #ddd;
	}

	.section-label.other {
		margin-top: 1rem;
	}

	.week-status-banner {
		background: #c0c0c0;
		color: #000080;
		padding: 0.5rem 0.75rem;
		border: 2px inset #ddd;
		text-align: center;
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
		font-weight: 700;
	}

	.no-week-message {
		text-align: center;
		padding: 3rem 1rem;
		background: #c0c0c0;
		border: 2px outset #ddd;
	}

	.no-week-message h2 {
		color: #000;
		margin-bottom: 0.5rem;
	}

	.no-week-message a {
		color: #000080;
	}
</style>
