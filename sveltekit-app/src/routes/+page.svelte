<script lang="ts">
	import WeekNavigator from '$lib/components/WeekNavigator.svelte';
	import TaskGroup from '$lib/components/TaskGroup.svelte';
	import { currentUser } from '$lib/stores/auth';

	let { data } = $props();

	const activeWeek = $derived(data.activeWeek);
	const taskGroups = $derived(data.taskGroups || []);
	const allWeeks = $derived(data.allWeeks || []);

	const userName = $derived($currentUser?.name ?? '');
	const isAdmin = $derived($currentUser?.role === 'admin' || $currentUser?.role === 'accountant');

	// Separate user's task group (pinned to top) from the rest
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
	<title>Tasks{activeWeek ? ` - Week ${activeWeek.weekNumber}` : ''}</title>
</svelte:head>

{#if activeWeek && allWeeks.length > 0}
	<div class="logo-container">
		<img src="/pics/seventwo_trans_bg.png" alt="hallway logo" />
	</div>

	<WeekNavigator {allWeeks} currentWeekId={String(activeWeek._id)} />

	<div class="task-groups-container">
		{#if myGroup}
			<div class="section-label">Your Task</div>
			<TaskGroup
				taskGroup={myGroup}
				weekStartDate={activeWeek.startDate}
				expanded={true}
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
					weekStartDate={activeWeek.startDate}
					expanded={false}
					{isAdmin}
				/>
			{/each}
		{/if}
	</div>
{:else}
	<div class="no-week-message">
		<h2>No Active Week</h2>
		<p>An administrator needs to set up the current week.</p>
	</div>
{/if}

<style>
	:global(body) {
		background-image: url('/pics/100px_tile.png');
		background-repeat: repeat;
		background-position: 0px 22px
	}

	.logo-container {
	display: flex;
	justify-content: center;
	padding: 1rem 0;
	}

	.logo-container img {
		max-width: 600px;
		height: auto;
	}

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

	.no-week-message p {
		color: var(--color-text-muted, #718096);
	}
</style>
