<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	// The `data` prop is passed from our +page.server.ts load function
	let { data } = $props();

	// Form state using Svelte 5 runes
	let selectedUserId = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	async function handleSetup(e: Event) {
		e.preventDefault();
		errorMsg = '';
		loading = true;

		if (!selectedUserId) {
			errorMsg = 'Please select your name from the list.';
			loading = false;
			return;
		}

		if (password !== confirmPassword) {
			errorMsg = 'Passwords do not match.';
			loading = false;
			return;
		}

		if (password.length < 6) {
			errorMsg = 'Password must be at least 6 characters.';
			loading = false;
			return;
		}

		try {
			const res = await fetch('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: selectedUserId, email, password })
			});

			const responseData = await res.json();

			if (!res.ok) {
				errorMsg = responseData.error || 'Account setup failed. Please try again.';
				return;
			}

			// On success, the backend sets an auth cookie.
			// We redirect and invalidate to force the layout to re-run its load function,
			// which will pick up the new user session.
			goto('/', { invalidateAll: true });
		} catch (err) {
			console.error('Setup form error:', err);
			errorMsg = 'A network error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="setup-page">
	<div class="setup-card">
		<h1>Set Up Your Account</h1>
		<p class="subtitle">Claim your account by selecting your name and setting a password.</p>

		{#if data.unclaimedUsers.length === 0}
			<div class="no-users">
				<p>All accounts have been claimed.</p>
				<p><a href="/login">Go to login</a></p>
			</div>
		{:else}
			<form onsubmit={handleSetup}>
				{#if errorMsg}
					<div class="error-message">{errorMsg}</div>
				{/if}

				<label>
					<span>Your Name</span>
					<select bind:value={selectedUserId} required disabled={loading}>
						<option value="" disabled>-- Select your name --</option>
						{#each data.unclaimedUsers as user}
							<option value={user._id}>{user.name}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Email</span>
					<input
						type="email"
						bind:value={email}
						placeholder="your@email.com"
						required
						autocomplete="email"
						disabled={loading} />
				</label>

				<label>
					<span>Password</span>
					<input
						type="password"
						bind:value={password}
						placeholder="At least 6 characters"
						required
						minlength="6"
						autocomplete="new-password"
						disabled={loading} />
				</label>

				<label>
					<span>Confirm Password</span>
					<input
						type="password"
						bind:value={confirmPassword}
						placeholder="Confirm your password"
						required
						minlength="6"
						autocomplete="new-password"
						disabled={loading} />
				</label>

				<button type="submit" class="btn-setup" disabled={loading}>
					{loading ? 'Setting up...' : 'Create Account'}
				</button>
			</form>
		{/if}

		<p class="login-link">
			Already have an account? <a href="/login">Sign in</a>
		</p>
	</div>
</div>

<style>
	.setup-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #c0c0c0;
		background-image: url('/pics/100px_new3.png');
		background-repeat: repeat;
		padding: 1rem;
	}

	.setup-card {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 2rem;
		width: 100%;
		max-width: 380px;
	}

	h1 { font-size: 1.3rem; text-align: center; color: #000; margin-bottom: 0.25rem; }

	.subtitle {
		text-align: center;
		color: #444;
		margin-bottom: 1.25rem;
		font-size: 0.9rem;
	}

	.no-users {
		text-align: center;
		padding: 1.5rem 0;
		color: #444;
	}

	.no-users a {
		color: #000080;
		font-weight: 700;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	label span {
		font-size: 0.85rem;
		font-weight: 400;
		color: #000;
	}

	input,
	select {
		padding: 0.4rem 0.5rem;
		border: 2px inset #ddd;
		background: #fff;
		font-size: 0.95rem;
		outline: none;
		color: #000;
		font-family: inherit;
	}

	input:focus,
	select:focus {
		outline: 1px dotted #000;
	}

	.btn-setup {
		background: #c0c0c0;
		color: #000;
		border: 2px outset #ddd;
		padding: 0.5rem;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		margin-top: 0.5rem;
		font-family: inherit;
	}

	.btn-setup:active {
		border-style: inset;
	}

	.btn-setup:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		background: #c0c0c0;
		color: #cc0000;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 2px inset #ddd;
		font-weight: 700;
	}

	.login-link {
		text-align: center;
		margin-top: 1rem;
		font-size: 0.85rem;
		color: #444;
	}

	.login-link a {
		color: #000080;
		font-weight: 700;
	}
</style>
