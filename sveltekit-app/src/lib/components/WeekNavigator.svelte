<script lang="ts">
	interface WeekSummary {
		_id: string;
		weekNumber: number;
		year: number;
		startDate: Date | string; // Can be Date or ISO string from API
		endDate: Date | string;
		status: string;
		rotationPeriod?: number; // 1-16 rotation period
		visible?: boolean;
	}

	// Format date as "Feb 10" style
	function formatDateShort(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	let { allWeeks, currentWeekId }: { allWeeks: WeekSummary[]; currentWeekId: string } = $props();

	const currentIndex = $derived(allWeeks.findIndex((w) => String(w._id) === currentWeekId));
	// Weeks are sorted descending (newest first), so:
	// - prevWeek (chronologically older) is at higher index
	// - nextWeek (chronologically newer) is at lower index
	const prevWeek = $derived(
		currentIndex < allWeeks.length - 1 ? allWeeks[currentIndex + 1] : null
	);
	const nextWeek = $derived(currentIndex > 0 ? allWeeks[currentIndex - 1] : null);
	const currentWeek = $derived(allWeeks[currentIndex]);

	// Check if next week has a different rotation period (indicates we're on the last week of a period)
	// The rotation changes after periods 8 and 16 (teams swap duplicate tasks)
	const isLastWeekOfPeriod = $derived(
		nextWeek && currentWeek?.rotationPeriod !== nextWeek?.rotationPeriod
	);
</script>

<div class="week-navigator">
	{#if prevWeek}
		<a href="/weeks/{prevWeek._id}" class="nav-arrow" title="Previous Week"><img src="/pics/next_red.png" alt="Previous" class="arrow-icon arrow-left" /></a>
	{:else}
		<span class="nav-arrow disabled"><img src="/pics/next_red.png" alt="" class="arrow-icon arrow-left" /></span>
	{/if}

	<div class="current-week">
		<span>
			{#if currentWeek?.startDate && currentWeek?.endDate}
				{formatDateShort(currentWeek.startDate)} – {formatDateShort(currentWeek.endDate)}
			{:else}
				Week {currentWeek?.weekNumber ?? '?'}, {currentWeek?.year ?? ''}
			{/if}
		</span>
	</div>

	{#if nextWeek}
		<a href="/weeks/{nextWeek._id}" class="nav-arrow" title="Next Week"><img src="/pics/next_red.png" alt="Next" class="arrow-icon" /></a>
	{:else}
		<span class="nav-arrow disabled"><img src="/pics/next_red.png" alt="" class="arrow-icon" /></span>
	{/if}
</div>

<style>
	.rotation-warning {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
		background: #c0c0c0;
		border: 2px inset #ddd;
		color: #806600;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.warning-icon {
		font-size: 1rem;
	}

	.week-navigator {
		display: flex;
		align-items: stretch;
		justify-content: center;
		gap: 0.3rem;
		margin-bottom: 1.25rem;
		font-size: 1.1rem;
	}
	.nav-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		padding: 0.15rem 0.3rem;
		background: #c0c0c0;
		border: 2px inset #ddd;
		align-self: stretch;
	}
	.nav-arrow:active {
		border-style: inset;
	}
	.nav-arrow.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.arrow-icon {
		display: block;
		height: 1.2em;
		width: auto;
		image-rendering: pixelated;
	}
	.arrow-left {
		transform: scaleX(-1);
	}
	.current-week {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		font-weight: 700;
		white-space: nowrap;
		color: #000;
		background: #c0c0c0;
		border: 2px inset #ddd;
		padding: 0.2rem 0.75rem;
	}
	.rotation-period {
		font-size: 0.75rem;
		color: #444;
		font-weight: 400;
	}
</style>
