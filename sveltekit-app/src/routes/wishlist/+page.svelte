<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll } from '$app/navigation';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

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

<SiteHeader activePage="wishlist" />

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
		padding: 0.75rem;
		margin-bottom: 0rem;
	}

	.add-row {
		display: flex;
		gap: 0.4rem;
	}

	.add-row input {
		flex: 1;
		padding: 0.4rem 0.5rem;
		border: 2px inset #ddd;
		background: #fff;
		font-size: 0.95rem;
		outline: none;
		font-family: inherit;
	}

	.add-row input:focus {
		outline: 1px dotted #000;
	}

	.empty-state {
		text-align: center;
		color: #444;
		padding: 2rem;
	}

	.wishlist-items {
		display: flex;
		flex-direction: column;
		gap: 0rem;
	}

	.wishlist-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
	}

	.item-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.vote-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		color: #000;
		font-size: 0.8rem;
		min-width: 36px;
	}

	.vote-btn:active {
		border-style: inset;
	}

	.vote-btn.voted {
		border-style: inset;
		background: #a0a0a0;
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
