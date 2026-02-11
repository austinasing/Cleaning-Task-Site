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
	const isAdmin = $derived(data.user?.role === 'admin' || data.user?.role === 'accountant');
	const pathname = $derived($page.url.pathname);

	// Auth pages that don't show the nav
	const isAuthPage = $derived(pathname === '/login' || pathname === '/setup');

	// Route protection: redirect to /login if not logged in and not on a public page.
	$effect(() => {
		if (!isLoggedIn && !isAuthPage) {
			goto('/login');
		}
	});

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		currentUser.set(null);
		goto('/login');
	}
</script>

<svelte:head>
	<title>Cleaning Tasks</title>
</svelte:head>

{#if isAuthPage}
	{@render children()}
{:else if isLoggedIn}
	<div class="app">
		<nav class="navbar">
			<div class="nav-left">
				<a href="/" class="nav-brand">Cleaning Tasks</a>
			</div>
			<div class="nav-links">
				<a href="/" class:active={pathname === '/'}>Tasks</a>
				<a href="/balance" class:active={pathname === '/balance'}>Balance</a>
				<a href="/wishlist" class:active={pathname === '/wishlist'}>Wishlist</a>
				<a href="/extra-tasks" class:active={pathname === '/extra-tasks'}>Extra Tasks</a>
			</div>
			<div class="nav-right">
				<span class="user-name">{data.user?.name}</span>
				<a href="/users/{data.user?.userId}" class="btn-profile" title="My Profile">
					<span>👤</span>
				</a>
				<button class="btn-logout" onclick={logout}>Log out</button>
			</div>
		</nav>
		<main class="content">
			{@render children()}
		</main>
	</div>
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
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f5f5f5;
		color: #333;
		line-height: 1.5;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.navbar {
		background: #2c3e50;
		color: white;
		padding: 0 1.5rem;
		display: flex;
		align-items: center;
		height: 56px;
		gap: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-brand {
		color: white;
		text-decoration: none;
		font-weight: 700;
		font-size: 1.1rem;
		white-space: nowrap;
	}

	.nav-links {
		display: flex;
		gap: 0.25rem;
		flex: 1;
	}

	.nav-links a {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: none;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.9rem;
		transition: background 0.15s, color 0.15s;
	}

	.nav-links a:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.nav-links a.active {
		background: rgba(255, 255, 255, 0.15);
		color: white;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		white-space: nowrap;
	}

	.user-name {
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.btn-profile {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		text-decoration: none;
		font-size: 1.2rem;
		transition: background 0.15s;
	}

	.btn-profile:hover { background: rgba(255, 255, 255, 0.2); }

	.btn-logout {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.3rem 0.7rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		transition: background 0.15s;
	}

	.btn-logout:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.content {
		flex: 1;
		padding: 1.5rem;
		max-width: 900px;
		width: 100%;
		margin: 0 auto;
	}

	.redirect-message {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		color: #666;
	}

	@media (max-width: 640px) {
		.navbar {
			padding: 0 0.75rem;
			gap: 0.5rem;
		}

		.nav-brand {
			font-size: 0.95rem;
		}

		.nav-links a {
			padding: 0.3rem 0.5rem;
			font-size: 0.8rem;
		}

		.content {
			padding: 1rem;
		}
	}
</style>
