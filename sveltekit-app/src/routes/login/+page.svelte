<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	// Reset password modal state
	let showResetModal = $state(false);
	let resetEmail = $state('');
	let resetPassword = $state('');
	let resetError = $state('');
	let resetSuccess = $state('');
	let resetLoading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'Login failed';
				return;
			}

			// Redirect to dashboard — layout.server.ts will pick up the new cookie
			goto('/', { invalidateAll: true });
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	function openResetModal() {
		showResetModal = true;
		resetEmail = email; // Pre-fill with current email
		resetPassword = '';
		resetError = '';
		resetSuccess = '';
	}

	function closeResetModal() {
		showResetModal = false;
		resetEmail = '';
		resetPassword = '';
		resetError = '';
		resetSuccess = '';
	}

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		resetError = '';
		resetSuccess = '';
		resetLoading = true;

		try {
			const res = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: resetEmail, newPassword: resetPassword })
			});

			const data = await res.json();

			if (!res.ok) {
				resetError = data.error || 'Password reset failed';
				return;
			}

			resetSuccess = 'Password reset successful! You can now log in with your new password.';
			setTimeout(() => {
				closeResetModal();
			}, 2000);
		} catch {
			resetError = 'Network error. Please try again.';
		} finally {
			resetLoading = false;
		}
	}
</script>

<div class="login-page">
	<div class="login-card">
		<h1>Cleaning Tasks</h1>
		<p class="subtitle">Sign in to your account</p>

		<form onsubmit={handleLogin}>
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<label>
				<span>Email</span>
				<input
					type="email"
					bind:value={email}
					placeholder="your@email.com"
					required
					autocomplete="email"
				/>
			</label>

			<label>
				<span>Password</span>
				<input
					type="password"
					bind:value={password}
					placeholder="Enter password"
					required
					autocomplete="current-password"
				/>
			</label>

			<button type="submit" class="btn-login" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign in'}
			</button>

			<button type="button" class="btn-reset" onclick={openResetModal}>
				Forgot password?
			</button>
		</form>

		<p class="setup-link">
			Don't have an account yet? <a href="/setup">Set up your account</a>
		</p>
	</div>
</div>

{#if showResetModal}
	<div class="modal-backdrop" onclick={closeResetModal} role="dialog" aria-modal="true">
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Reset Password</h2>
			<p class="modal-subtitle">Enter your email and new password</p>

			<form onsubmit={handleResetPassword}>
				{#if resetError}
					<div class="error-message">{resetError}</div>
				{/if}

				{#if resetSuccess}
					<div class="success-message">{resetSuccess}</div>
				{/if}

				<label>
					<span>Email</span>
					<input
						type="email"
						bind:value={resetEmail}
						placeholder="your@email.com"
						required
						autocomplete="email"
					/>
				</label>

				<label>
					<span>New Password</span>
					<input
						type="password"
						bind:value={resetPassword}
						placeholder="Enter new password (min 6 characters)"
						required
						minlength="6"
						autocomplete="new-password"
					/>
				</label>

				<div class="modal-actions">
					<button type="button" class="btn-cancel" onclick={closeResetModal}>Cancel</button>
					<button type="submit" class="btn-confirm" disabled={resetLoading}>
						{resetLoading ? 'Resetting...' : 'Reset Password'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #c0c0c0;
		background-image: url('/pics/100px_new3.png');
		background-repeat: repeat;
		padding: 1rem;
	}

	.login-card {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 2rem;
		width: 100%;
		max-width: 360px;
	}

	h1 {
		font-size: 1.3rem;
		text-align: center;
		color: #000;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		text-align: center;
		color: #444;
		margin-bottom: 1.25rem;
		font-size: 0.9rem;
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

	input {
		padding: 0.4rem 0.5rem;
		border: 2px inset #ddd;
		background: #fff;
		font-size: 0.95rem;
		outline: none;
		font-family: inherit;
	}

	input:focus {
		outline: 1px dotted #000;
	}

	.btn-login {
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

	.btn-login:active {
		border-style: inset;
	}

	.btn-login:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-reset {
		background: transparent;
		color: #444;
		border: none;
		padding: 0.4rem;
		font-size: 0.85rem;
		cursor: pointer;
		text-align: center;
		font-family: inherit;
	}

	.btn-reset:hover {
		color: #000;
		text-decoration: underline;
	}

	.error-message {
		background: #c0c0c0;
		color: #cc0000;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 2px inset #ddd;
		font-weight: 700;
	}

	.success-message {
		background: #c0c0c0;
		color: #008000;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 2px inset #ddd;
		font-weight: 700;
	}

	.setup-link {
		text-align: center;
		margin-top: 1rem;
		font-size: 0.85rem;
		color: #444;
	}

	.setup-link a {
		color: #000080;
		font-weight: 700;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 1.25rem;
		width: 100%;
		max-width: 360px;
	}

	.modal h2 {
		font-size: 1.1rem;
		color: #fff;
		background: #000080;
		padding: 0.3rem 0.5rem;
		margin: -1.25rem -1.25rem 1rem -1.25rem;
		padding: 0.4rem 0.75rem;
		font-weight: 700;
	}

	.modal-subtitle {
		color: #444;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.btn-cancel,
	.btn-confirm {
		flex: 1;
		padding: 0.4rem;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
		background: #c0c0c0;
		border: 2px outset #ddd;
		color: #000;
		font-family: inherit;
	}

	.btn-cancel:active,
	.btn-confirm:active {
		border-style: inset;
	}

	.btn-confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
