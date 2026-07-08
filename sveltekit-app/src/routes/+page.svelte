<script lang="ts">
	import WeekNavigator from '$lib/components/WeekNavigator.svelte';
	import TaskGroup from '$lib/components/TaskGroup.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { currentUser } from '$lib/stores/auth';

	let { data } = $props();

	const activeWeek = $derived(data.activeWeek);
	const taskGroups = $derived(data.taskGroups || []);
	const allWeeks = $derived(data.allWeeks || []);
	const userEmojiMap = $derived(data.userEmojiMap || {});

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
	<SiteHeader activePage="tasks" />

	<WeekNavigator {allWeeks} currentWeekId={String(activeWeek._id)} />

	<div class="task-groups-container">
		{#if myGroup}
			<div class="section-label">Your Task</div>
			<TaskGroup
				taskGroup={myGroup}
				weekStartDate={activeWeek.startDate}
				expanded={true}
				{userEmojiMap}
			/>
		{/if}

		{#if otherGroups.length > 0}
			{#if myGroup}
				<div class="section-label other">Other Tasks</div>
			{/if}
			<div class="other-tasks-list">
				{#each otherGroups as taskGroup (taskGroup._id)}
					<TaskGroup
						{taskGroup}
						weekStartDate={activeWeek.startDate}
						expanded={false}
						{userEmojiMap}
					/>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="no-week-message">
		<h2>No Active Week</h2>
		<p>An administrator needs to set up the current week.</p>
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

	.other-tasks-list :global(.task-group) {
		margin-bottom: 0;
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

	.no-week-message p {
		color: var(--color-text-muted, #444);
	}

</style>
