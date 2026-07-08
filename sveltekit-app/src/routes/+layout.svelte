<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { currentUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let { data, children } = $props();

	// Sync server-side user to client store
	$effect(() => {
		currentUser.set(data.user);
	});

	const isLoggedIn = $derived(data.user !== null);
	const pathname = $derived($page.url.pathname);

	// Auth pages that don't show the nav
	const isAuthPage = $derived(pathname === '/login' || pathname === '/setup');
	const isUserPage = $derived(pathname.startsWith('/users/'));

	// Route protection: redirect to /login if not logged in and not on a public page.
	$effect(() => {
		if (!isLoggedIn && !isAuthPage) {
			goto('/login');
		}
	});

	let showInfo = $state(false);
</script>

<svelte:head>
	<title>Cleaning Tasks</title>
</svelte:head>

{#if isAuthPage}
	{@render children()}
{:else if isLoggedIn}
	<div class="app">
		<button class="corner-btn info-btn" title="Site Info" onclick={() => showInfo = true}>&#9432;</button>
		{#if isUserPage}
			<a href="/" class="corner-btn" title="Home"><img src="/pics/address_book_home.png" alt="Home" class="home-icon" /></a>
		{:else}
			<a href="/users/{data.user?.userId}" class="corner-btn" title="My Profile">
				{data.user?.emoji || '👤'}
			</a>
		{/if}
		<main class="content">
			{@render children()}
		</main>
	</div>

	{#if showInfo}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => showInfo = false}>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div class="info-modal" role="document" onclick={(e) => e.stopPropagation()}>
				<div class="info-modal-title">
					<span>&#9432; How to use the task site</span>
					<button class="title-close-btn" onclick={() => showInfo = false}>&#x2715;</button>
				</div>
				<div class="info-modal-body">
					<p>Submit your tasks on the main page. If you don't submit them on time, the task will be blocked off.
					You can then either mark it done if you just forgot, or as late if you did it after. Be honest!</p>
					<p>If you mark it late, a fine will appear in your balance.
						If no one marks the task as late in 3 days, the full €15 fine will be applied to all members of the task group. 
						Once you pay the fine, you can either directly resolve it or submit a payment to reset your balance.</p>
					<p>Instead of paying a fine, you can also complete a bonus task for balance credit.
						Feel free to create your own bonus tasks, just send it in the group first for approval</p>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="redirect-message">
		<p>Redirecting to login...</p>
	</div>
{/if}

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		background-color: #c0c0c0;
		background-image: url('/pics/100px_new3.png');
		background-repeat: repeat;
		background-position: 30px 0;
		color: #000;
		line-height: 1.4;
		font-size: 14px;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.corner-btn {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 100;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #c0c0c0;
		border: 2px outset #ddd;
		text-decoration: none;
		font-size: 1.2rem;
		cursor: pointer;
	}

	.corner-btn:active {
		border-style: inset;
	}

	.info-btn {
		top: calc(1rem + 36px + 0.5rem);
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary, #000080);
		background: #c0c0c0;
		border: 2px outset #ddd;
		cursor: pointer;
		font-family: inherit;
	}

	.info-modal {
		background: #c0c0c0;
		border: 2px outset #ddd;
		width: calc(100vw - 2rem);
		max-width: 700px;
		max-height: calc(100vh - 2rem);
		display: flex;
		flex-direction: column;
	}

	.info-modal-title {
		background: var(--color-primary, #000080);
		color: #fff;
		padding: 0.4rem 0.75rem;
		font-weight: 700;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.title-close-btn {
		background: #c0c0c0;
		border: 2px outset #ddd;
		color: #000;
		font-size: 0.75rem;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		font-family: inherit;
		line-height: 1;
	}

	.title-close-btn:active {
		border-style: inset;
	}

	.info-modal-body {
		padding: 1rem 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	.info-modal-body h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #000;
		margin-top: 1rem;
		margin-bottom: 0.4rem;
		border-bottom: 1px solid #808080;
		padding-bottom: 0.2rem;
	}

	.info-modal-body h2:first-child {
		margin-top: 0;
	}

	.info-modal-body p {
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
		color: #000;
	}

	.info-modal-body ul {
		font-size: 0.9rem;
		padding-left: 1.5rem;
		margin-bottom: 0.5rem;
		color: #000;
	}

	.info-modal-body li {
		margin-bottom: 0.3rem;
	}

	.home-icon {
		width: 28px;
		height: 28px;
		image-rendering: pixelated;
	}

	.content {
		flex: 1;
		padding: 1rem;
		max-width: 600px;
		width: 100%;
		margin: 0 auto;
	}

	.redirect-message {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		color: #000;
	}

	@media (max-width: 640px) {
		.content {
			padding: 0.75rem;
			padding-top: 0.75rem;
		}

		.corner-btn {
			right: 0.75rem;
		}
	}
</style>
