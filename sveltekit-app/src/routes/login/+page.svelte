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
		background: #f5f5f5;
		padding: 1rem;
	}

	.login-card {
		background: white;
		border-radius: 12px;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
	}

	h1 {
		font-size: 1.5rem;
		text-align: center;
		color: #2c3e50;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		text-align: center;
		color: #666;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	label span {
		font-size: 0.85rem;
		font-weight: 500;
		color: #555;
	}

	input {
		padding: 0.6rem 0.75rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: #2c3e50;
	}

	.btn-login {
		background: #2c3e50;
		color: white;
		border: none;
		padding: 0.7rem;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 0.5rem;
		transition: background 0.15s;
	}

	.btn-login:hover:not(:disabled) {
		background: #34495e;
	}

	.btn-login:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-reset {
		background: transparent;
		color: #666;
		border: none;
		padding: 0.4rem;
		font-size: 0.85rem;
		cursor: pointer;
		text-align: center;
		transition: color 0.15s;
	}

	.btn-reset:hover {
		color: #2c3e50;
		text-decoration: underline;
	}

	.error-message {
		background: #f8d7da;
		color: #721c24;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		font-size: 0.9rem;
		border: 1px solid #f5c6cb;
	}

	.success-message {
		background: #d4edda;
		color: #155724;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		font-size: 0.9rem;
		border: 1px solid #c3e6cb;
	}

	.setup-link {
		text-align: center;
		margin-top: 1.25rem;
		font-size: 0.85rem;
		color: #666;
	}

	.setup-link a {
		color: #2c3e50;
		font-weight: 600;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
	}

	.modal h2 {
		font-size: 1.25rem;
		color: #2c3e50;
		margin-bottom: 0.25rem;
	}

	.modal-subtitle {
		color: #666;
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.btn-cancel,
	.btn-confirm {
		flex: 1;
		padding: 0.6rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-cancel {
		background: #f5f5f5;
		color: #666;
		border: 1px solid #ddd;
	}

	.btn-cancel:hover {
		background: #e8e8e8;
	}

	.btn-confirm {
		background: #2c3e50;
		color: white;
		border: none;
	}

	.btn-confirm:hover:not(:disabled) {
		background: #34495e;
	}

	.btn-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
