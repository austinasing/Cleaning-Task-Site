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

{#if isLastWeekOfPeriod}
	<div class="rotation-warning">
		<span class="warning-icon">&#9888;</span>
		<span class="warning-text">Task rotation changes next week!</span>
	</div>
{/if}

<div class="week-navigator">
	{#if prevWeek}
		<a href="/weeks/{prevWeek._id}" class="nav-arrow" title="Previous Week">&larr;</a>
	{:else}
		<span class="nav-arrow disabled">&larr;</span>
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
		<a href="/weeks/{nextWeek._id}" class="nav-arrow" title="Next Week">&rarr;</a>
	{:else}
		<span class="nav-arrow disabled">&rarr;</span>
	{/if}
</div>

<style>
	.rotation-warning {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
		border: 1px solid #ffc107;
		border-radius: 8px;
		color: #856404;
		font-weight: 500;
		font-size: 0.95rem;
	}

	.warning-icon {
		font-size: 1.1rem;
	}

	.week-navigator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		margin-bottom: 2rem;
		font-size: 1.2rem;
	}
	.nav-arrow {
		font-size: 1.5rem;
		font-weight: bold;
		color: var(--color-primary, #2c3e50);
		text-decoration: none;
		padding: 0 0.5rem;
		transition: color 0.15s;
	}
	.nav-arrow:hover {
		color: var(--color-accent, #3498db);
	}
	.nav-arrow.disabled {
		color: #ccc;
		cursor: not-allowed;
	}
	.current-week {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		font-weight: 500;
		white-space: nowrap;
	}
	.rotation-period {
		font-size: 0.75rem;
		color: var(--color-text-muted, #718096);
		font-weight: 400;
	}
</style>
