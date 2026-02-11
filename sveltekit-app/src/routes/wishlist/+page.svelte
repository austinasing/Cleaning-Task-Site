<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	const items = $derived(data.items || []);
	const userId = $derived($currentUser?.userId ?? '');

	let newItem = $state('');
	let adding = $state(false);
	let errorMsg = $state('');

	async function addItem(e: Event) {
		e.preventDefault();
		if (!newItem.trim()) return;
		adding = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/wishlist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ item: newItem.trim() })
			});

			if (!res.ok) {
				const d = await res.json();
				errorMsg = d.error || 'Failed to add item';
				return;
			}

			newItem = '';
			await invalidateAll();
		} finally {
			adding = false;
		}
	}

	async function toggleVote(itemId: string) {
		await fetch(`/api/wishlist/${itemId}`, { method: 'PATCH' });
		await invalidateAll();
	}

	async function deleteItem(itemId: string) {
		await fetch(`/api/wishlist/${itemId}`, { method: 'DELETE' });
		await invalidateAll();
	}

	function hasVoted(item: any): boolean {
		return item.votes.some((v: string) => String(v) === userId);
	}
</script>

<svelte:head>
	<title>Wishlist</title>
</svelte:head>

<div class="page-header">
	<h1>Wishlist</h1>
	<p>Vote on items you'd like for the house</p>
</div>

<!-- Add item form -->
<form class="card add-form" onsubmit={addItem}>
	{#if errorMsg}
		<div class="error-message">{errorMsg}</div>
	{/if}
	<div class="add-row">
		<input
			type="text"
			bind:value={newItem}
			placeholder="Suggest an item..."
			disabled={adding}
		/>
		<button class="btn btn-primary" type="submit" disabled={adding || !newItem.trim()}>
			{adding ? '...' : 'Add'}
		</button>
	</div>
</form>

<!-- Wishlist items -->
{#if items.length === 0}
	<p class="empty-state">No items yet. Be the first to suggest something!</p>
{:else}
	<div class="wishlist-items">
		{#each items as item (item._id)}
			<div class="card wishlist-item">
				<div class="item-main">
					<button
						class="vote-btn"
						class:voted={hasVoted(item)}
						onclick={() => toggleVote(item._id)}
						title={hasVoted(item) ? 'Remove vote' : 'Upvote'}
					>
						&#9650;
						<span class="vote-count">{item.votes.length}</span>
					</button>
					<span class="item-name">{item.item}</span>
				</div>
				<div class="item-actions">
					<button class="btn btn-outline btn-sm" onclick={() => deleteItem(item._id)}>
						Delete
					</button>
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.add-form {
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.add-row {
		display: flex;
		gap: 0.5rem;
	}

	.add-row input {
		flex: 1;
		padding: 0.6rem 0.75rem;
		border: 1px solid #ddd;
		border-radius: var(--radius, 8px);
		font-size: 0.95rem;
		outline: none;
	}

	.add-row input:focus {
		border-color: var(--color-primary, #2c3e50);
	}

	.empty-state {
		text-align: center;
		color: var(--color-text-muted, #718096);
		padding: 3rem;
	}

	.wishlist-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.wishlist-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
	}

	.item-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.vote-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: none;
		border: 1px solid var(--color-border, #e2e8f0);
		border-radius: var(--radius, 8px);
		padding: 0.3rem 0.6rem;
		cursor: pointer;
		color: var(--color-text-muted, #718096);
		font-size: 0.8rem;
		transition: all 0.15s;
		min-width: 40px;
	}

	.vote-btn:hover {
		border-color: var(--color-accent, #3498db);
		color: var(--color-accent, #3498db);
	}

	.vote-btn.voted {
		background: var(--color-accent, #3498db);
		border-color: var(--color-accent, #3498db);
		color: white;
	}

	.vote-count {
		font-weight: 700;
		font-size: 0.85rem;
	}

	.item-name {
		font-size: 0.95rem;
	}

	.item-actions {
		flex-shrink: 0;
	}
</style>
