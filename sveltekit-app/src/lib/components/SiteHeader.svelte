<script lang="ts">
	type Page = 'tasks' | 'balance' | 'wishlist' | 'extra-tasks';
	let { activePage }: { activePage: Page } = $props();
</script>

<div class="logo-container">
	<img src="/pics/seventwo_trans_bg.png" alt="hallway logo" />
</div>

<nav class="site-nav">
	<a href="/" class="nav-btn" class:active={activePage === 'tasks'}>Tasks</a>
	<a href="/balance" class="nav-btn" class:active={activePage === 'balance'}>Balance</a>
	<a href="/wishlist" class="nav-btn" class:active={activePage === 'wishlist'}>Wishlist</a>
	<a href="/extra-tasks" class="nav-btn" class:active={activePage === 'extra-tasks'}>Bonus</a>
</nav>

<style>
	.logo-container {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0;
	}

	.logo-container img {
		max-width: 100%;
		width: 400px;
		height: auto;
	}

	.site-nav {
		display: flex;
		justify-content: center;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}

	.nav-btn {
		flex: 1;
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 0.4rem 1.25rem;
		text-decoration: none;
		color: #000;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		text-align: center;
	}

	.nav-btn:active,
	.nav-btn.active {
		border-style: inset;
		background: #a0a0a0;
	}

	@media (max-width: 640px) {
		.logo-container img {
			width: 280px;
		}

		.nav-btn {
			padding: 0.4rem 1rem;
			font-size: 0.85rem;
		}
	}
</style>
