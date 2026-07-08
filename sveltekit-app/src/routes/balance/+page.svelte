<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll } from '$app/navigation';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	let { data } = $props();

	const balances = $derived(data.balances || []);
	const users = $derived(data.users || []);
	const currentUserBalance = $derived(data.currentUserBalance ?? 0);
	const unclaimedFines = $derived(data.unclaimedFines || []);
	const pendingTransactions = $derived(data.pendingTransactions || []);
	const isPrivileged = $derived(data.isPrivileged);

	// Transaction view mode
	let viewMode = $state<'mine' | 'all'>('mine');
	let filterUserId = $state('');
	const transactions = $derived(
		filterUserId
			? (data.transactions || []).filter((tx: any) => tx.userId?.toString() === filterUserId)
			: viewMode === 'mine'
				? (data.transactions || []).filter((tx: { userId: string }) =>
					tx.userId === $currentUser?.userId || tx.userId?.toString() === $currentUser?.userId
				  )
				: data.transactions || []
	);

	// Payment request form state
	let showPaymentRequest = $state(false);
	let paymentAmount = $state(0);
	let paymentSubmitting = $state(false);
	let paymentError = $state('');
	let paymentSuccess = $state('');

	// Admin payment form state
	let showAdminForm = $state(false);
	let adminUserId = $state('');
	let adminAmount = $state(0);
	let adminType = $state('payment');
	let adminDescription = $state('');
	let adminSubmitting = $state(false);
	let adminError = $state('');
	let adminSuccess = $state('');

	// Admin edit state
	let editingTx = $state<{ _id: string; amount: number; description: string; status: string } | null>(null);
	let editAmount = $state(0);
	let editDescription = $state('');
	let editStatus = $state('');
	let editSubmitting = $state(false);
	let editError = $state('');

	// Pending approvals filter
	let filterPendingUserId = $state('');
	const filteredPendingTransactions = $derived(
		filterPendingUserId
			? pendingTransactions.filter((tx: any) => tx.userId?.toString() === filterPendingUserId)
			: pendingTransactions
	);

	// Action states
	let actionLoading = $state<string | null>(null);
	let actionError = $state('');

	async function submitPaymentRequest(e: Event) {
		e.preventDefault();
		paymentSubmitting = true;
		paymentError = '';
		paymentSuccess = '';

		try {
			const res = await fetch('/api/balance/request-payment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ amount: paymentAmount })
			});

			const result = await res.json();

			if (!res.ok) {
				paymentError = result.error || 'Failed to submit payment request';
				return;
			}

			paymentSuccess = 'Payment submitted - pending confirmation';
			paymentAmount = 0;
			showPaymentRequest = false;
			await invalidateAll();
		} finally {
			paymentSubmitting = false;
		}
	}

	async function claimFine(transactionId: string) {
		actionLoading = transactionId;
		actionError = '';

		try {
			const res = await fetch('/api/balance/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionId })
			});

			const result = await res.json();

			if (!res.ok) {
				actionError = result.error || 'Failed to claim fine';
				return;
			}

			await invalidateAll();
		} finally {
			actionLoading = null;
		}
	}

	async function markAsPaid(transactionId: string) {
		actionLoading = transactionId;
		actionError = '';

		try {
			const res = await fetch('/api/balance/mark-paid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionId })
			});

			const result = await res.json();

			if (!res.ok) {
				actionError = result.error || 'Failed to mark as paid';
				return;
			}

			await invalidateAll();
		} finally {
			actionLoading = null;
		}
	}

	async function approveTransaction(transactionId: string, action: 'approve' | 'reject') {
		actionLoading = transactionId;
		actionError = '';

		try {
			const res = await fetch('/api/balance/approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionId, action })
			});

			const result = await res.json();

			if (!res.ok) {
				actionError = result.error || `Failed to ${action}`;
				return;
			}

			await invalidateAll();
		} finally {
			actionLoading = null;
		}
	}

	async function submitAdminTransaction(e: Event) {
		e.preventDefault();
		adminSubmitting = true;
		adminError = '';
		adminSuccess = '';

		try {
			const res = await fetch('/api/admin/transactions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: adminUserId,
					amount: adminAmount,
					type: adminType,
					description: adminDescription
				})
			});

			const result = await res.json();

			if (!res.ok) {
				adminError = result.error || 'Failed to create transaction';
				return;
			}

			adminSuccess = `Transaction created! New balance: €${result.newBalance?.toFixed(2)}`;
			adminUserId = '';
			adminAmount = 0;
			adminDescription = '';
			await invalidateAll();
		} finally {
			adminSubmitting = false;
		}
	}

	function startEdit(tx: { _id: string; amount: number; description: string; status: string }) {
		editingTx = tx;
		editAmount = tx.amount;
		editDescription = tx.description;
		editStatus = tx.status;
		editError = '';
	}

	function cancelEdit() {
		editingTx = null;
		editError = '';
	}

	async function saveEdit() {
		if (!editingTx) return;
		editSubmitting = true;
		editError = '';

		try {
			const res = await fetch('/api/admin/transactions', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transactionId: editingTx._id,
					amount: editAmount,
					description: editDescription,
					status: editStatus
				})
			});

			const result = await res.json();

			if (!res.ok) {
				editError = result.error || 'Failed to update transaction';
				return;
			}

			editingTx = null;
			await invalidateAll();
		} finally {
			editSubmitting = false;
		}
	}

	async function deleteTransaction(transactionId: string) {
		if (!confirm('Are you sure you want to delete this transaction?')) return;

		actionLoading = transactionId;
		actionError = '';

		try {
			const res = await fetch('/api/admin/transactions', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transactionId })
			});

			const result = await res.json();

			if (!res.ok) {
				actionError = result.error || 'Failed to delete transaction';
				return;
			}

			await invalidateAll();
		} finally {
			actionLoading = null;
		}
	}

	function formatAmount(amount: number): string {
		const sign = amount >= 0 ? '+' : '';
		return `${sign}€${amount.toFixed(2)}`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function typeLabel(type: string): string {
		const labels: Record<string, string> = {
			task_fine: 'Task Fine',
			late_task_fine: 'Late Fine',
			supply_reimbursment: 'Reimbursement',
			payment: 'Payment',
			payment_request: 'Payment',
			fine_payment: 'Fine Payment'
		};
		return labels[type] || type;
	}

	function statusLabel(status: string): string {
		const labels: Record<string, string> = {
			unclaimed: 'Unclaimed',
			claimed: 'Claimed',
			outstanding: 'Outstanding',
			paid_pending: 'Paid | Pending Confirmation',
			resolved: 'Resolved',
			waived: 'Waived',
			rejected: 'Rejected'
		};
		return labels[status] || status;
	}
</script>

<svelte:head>
	<title>Hallway Balance</title>
</svelte:head>

<SiteHeader activePage="balance" />

<!-- Your Balance -->
<div class="card your-balance">
	<div class="balance-label">Your Balance</div>
	<div class="balance-amount" class:negative={currentUserBalance < 0} class:positive={currentUserBalance > 0}>
		€{currentUserBalance.toFixed(2)}
	</div>
</div>

<!-- Unclaimed Fines -->
{#if unclaimedFines.length > 0}
	<div class="section">
		<h2>Unclaimed Fines</h2>
		<p class="section-desc">These fines can be claimed by you or your teammate. Claiming removes the fine from the other person.</p>
		{#if actionError}
			<div class="error-message">{actionError}</div>
		{/if}
		<div class="fine-list">
			{#each unclaimedFines as fine}
				<div class="card fine-item">
					<div class="fine-info">
						<span class="fine-amount negative">€{Math.abs(fine.amount).toFixed(2)}</span>
						<span class="fine-desc">{fine.description}</span>
						{#if fine.pairedUserName}
							<span class="fine-paired">Shared with: {fine.pairedUserName}</span>
						{/if}
					</div>
					<button
						class="btn btn-secondary"
						onclick={() => claimFine(fine._id)}
						disabled={actionLoading === fine._id}
					>
						{actionLoading === fine._id ? 'Claiming...' : 'Claim Responsibility'}
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<!-- Submit Payment -->
<div class="section">
	{#if !showPaymentRequest}
		<div class="submit-payment-wrapper">
			<button
				class="btn btn-primary submit-payment-btn"
				onclick={() => (showPaymentRequest = true)}
			>
				<img src="/pics/address_book-0.png" alt="" class="btn-icon" />
				Submit Payment
			</button>
		</div>
	{:else}
		<form class="card payment-form" onsubmit={submitPaymentRequest}>
			{#if paymentError}
				<div class="error-message">{paymentError}</div>
			{/if}
			{#if paymentSuccess}
				<div class="success-message">{paymentSuccess}</div>
			{/if}

			<div class="form-group">
				<input
					id="payment-amount"
					type="number"
					step="0.01"
					min="0.01"
					bind:value={paymentAmount}
					required
					placeholder="Amount sent e.g., 15"
				/>
			</div>

			<div class="payment-actions">
				<button class="btn btn-primary" type="submit" disabled={paymentSubmitting}>
					{paymentSubmitting ? 'Submitting...' : 'Submit'}
				</button>
				<button class="btn" type="button" onclick={() => { showPaymentRequest = false; paymentError = ''; paymentSuccess = ''; }}>
					Cancel
				</button>
			</div>

			<div class="bank-details">
				<div class="bank-details-title">Bank Transfer Details</div>
				<div class="bank-details-row"><span class="bank-label">Name:</span> <span>Z BASARAN</span></div>
				<div class="bank-details-row"><span class="bank-label">IBAN:</span> <span>NL16 ABNA 0132 2473 56</span></div>
			</div>
		</form>
	{/if}
</div>

<!-- Pending Approvals (Admin/Accountant only) -->
{#if isPrivileged}
	<div class="section admin-section">
		<div class="section-header">
			<h2>Admin: Pending Approvals</h2>
			<select
				class="user-filter-select"
				bind:value={filterPendingUserId}
			>
				<option value="">All users</option>
				{#each users as user}
					<option value={user._id}>{user.name}</option>
				{/each}
			</select>
		</div>
		{#if filteredPendingTransactions.length === 0}
			<p class="no-pending">{filterPendingUserId ? 'No pending approvals for this user' : 'No payments to approve'}</p>
		{:else}
			<div class="transaction-list">
				{#each filteredPendingTransactions as tx}
					<div class="card transaction-item pending">
						<div class="tx-top">
							<span class="tx-user">{tx.userName}</span>
							<span class="tx-badge badge">{typeLabel(tx.type)}</span>
						</div>
						<div class="tx-description">{tx.description}</div>
						<div class="tx-bottom">
							<span class="tx-amount" class:negative={tx.amount < 0} class:positive={tx.amount > 0}>
								{formatAmount(tx.amount)}
							</span>
							<div class="approval-actions">
								<button
									class="btn btn-success btn-small"
									onclick={() => approveTransaction(tx._id, 'approve')}
									disabled={actionLoading === tx._id}
								>
									Approve
								</button>
								<button
									class="btn btn-danger btn-small"
									onclick={() => approveTransaction(tx._id, 'reject')}
									disabled={actionLoading === tx._id}
								>
									Reject
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- Admin: Create Transaction -->
{#if isPrivileged}
	<div class="section admin-section">
		<h2>Admin: Manage Transactions</h2>
		<button
			class="btn btn-primary"
			onclick={() => (showAdminForm = !showAdminForm)}
		>
			{showAdminForm ? 'Close' : 'Create Custom Transaction'}
		</button>

		{#if showAdminForm}
			<form class="card payment-form" onsubmit={submitAdminTransaction}>
				{#if adminError}
					<div class="error-message">{adminError}</div>
				{/if}
				{#if adminSuccess}
					<div class="success-message">{adminSuccess}</div>
				{/if}

				<div class="form-group">
					<label for="admin-user">User</label>
					<select id="admin-user" bind:value={adminUserId} required>
						<option value="" disabled>Select user</option>
						{#each users as user}
							<option value={user._id}>{user.name}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="admin-type">Type</label>
					<select id="admin-type" bind:value={adminType}>
						<option value="payment">Payment (credit)</option>
						<option value="supply_reimbursment">Supply Reimbursement</option>
						<option value="task_fine">Task Fine</option>
					</select>
				</div>

				<div class="form-group">
					<label for="admin-amount">Amount (positive = credit, negative = fine)</label>
					<input id="admin-amount" type="number" step="0.01" bind:value={adminAmount} required />
				</div>

				<div class="form-group">
					<label for="admin-desc">Description</label>
					<input id="admin-desc" type="text" bind:value={adminDescription} required placeholder="e.g., Custom adjustment" />
				</div>

				<button class="btn btn-primary" type="submit" disabled={adminSubmitting}>
					{adminSubmitting ? 'Creating...' : 'Create Transaction'}
				</button>
			</form>
		{/if}
	</div>
{/if}

<!-- Transactions -->
<div class="section">
	<div class="section-header">
		<h2>Transactions</h2>
		<div class="view-toggle">
			<button
				class="toggle-btn"
				class:active={viewMode === 'mine' && !filterUserId}
				onclick={() => { viewMode = 'mine'; filterUserId = ''; }}
			>
				Mine
			</button>
			<button
				class="toggle-btn"
				class:active={viewMode === 'all' && !filterUserId}
				onclick={() => { viewMode = 'all'; filterUserId = ''; }}
			>
				All
			</button>
			<select
				class="user-filter-select"
				bind:value={filterUserId}
				onchange={() => { if (filterUserId) viewMode = 'all'; }}
			>
				<option value="">Filter user...</option>
				{#each users as user}
					<option value={user._id}>{user.name}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if transactions.length === 0}
		<p class="empty-state">No transactions yet.</p>
	{:else}
		<div class="transaction-list">
			{#each transactions as tx}
				<div class="card transaction-item">
					{#if editingTx?._id === tx._id}
						<!-- Edit mode -->
						<div class="edit-form">
							{#if editError}
								<div class="error-message">{editError}</div>
							{/if}
							<div class="edit-row">
								<label>
									Amount:
									<input type="number" step="0.01" bind:value={editAmount} />
								</label>
							</div>
							<div class="edit-row">
								<label>
									Description:
									<input type="text" bind:value={editDescription} />
								</label>
							</div>
							<div class="edit-row">
								<label>
									Status:
									<select bind:value={editStatus}>
										<option value="unclaimed">Unclaimed</option>
										<option value="claimed">Claimed</option>
										<option value="outstanding">Outstanding</option>
										<option value="paid_pending">Pending Approval</option>
										<option value="resolved">Resolved</option>
										<option value="waived">Waived</option>
										<option value="rejected">Rejected</option>
									</select>
								</label>
							</div>
							<div class="edit-actions">
								<button class="btn btn-success btn-small" onclick={saveEdit} disabled={editSubmitting}>
									{editSubmitting ? 'Saving...' : 'Save'}
								</button>
								<button class="btn btn-secondary btn-small" onclick={cancelEdit}>Cancel</button>
							</div>
						</div>
					{:else}
						<!-- Display mode -->
						<div class="tx-top">
							<span class="tx-user">{tx.userName || 'You'}</span>
							<div class="tx-badges">
								<span class="tx-badge badge" class:badge-danger={tx.amount < 0} class:badge-success={tx.amount >= 0}>
									{typeLabel(tx.type)}
								</span>
								{#if tx.status !== 'outstanding' && tx.status !== 'resolved'}
									<span class="tx-status badge">{statusLabel(tx.status)}</span>
								{/if}
							</div>
						</div>
						<div class="tx-description">{tx.description}</div>
						<div class="tx-bottom">
							<span class="tx-amount" class:negative={tx.amount < 0} class:positive={tx.amount > 0}>
								{formatAmount(tx.amount)}
							</span>
							<div class="tx-actions">
								{#if tx.status === 'outstanding' && tx.amount < 0 && tx.userId?.toString() === $currentUser?.userId}
									<button
										class="btn btn-small"
										onclick={() => markAsPaid(tx._id)}
										disabled={actionLoading === tx._id}
									>
										{actionLoading === tx._id ? '...' : 'Mark Paid'}
									</button>
								{/if}
								{#if isPrivileged}
									<button
										class="btn btn-small btn-outline"
										onclick={() => startEdit(tx)}
									>
										Edit
									</button>
									<button
										class="btn btn-small btn-danger"
										onclick={() => deleteTransaction(tx._id)}
										disabled={actionLoading === tx._id}
									>
										{actionLoading === tx._id ? '...' : 'Del'}
									</button>
								{/if}
								<span class="tx-date">{formatDate(tx.createdAt)}</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Everyone's Balance -->
<div class="section">
	<h2>Everyone's Balance</h2>
	<div class="card balance-table">
		<div class="table-header">
			<span class="col-name">Name</span>
			<span class="col-balance">Balance</span>
		</div>
		{#each balances as user}
			<div class="table-row">
				<span class="col-name">
					{#if user.emoji}<span class="emoji">{user.emoji}</span>{/if}
					{user.name}
				</span>
				<span
					class="col-balance"
					class:negative={user.hallwayBalance < 0}
					class:positive={user.hallwayBalance > 0}
				>
					€{user.hallwayBalance.toFixed(2)}
				</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.your-balance {
		text-align: center;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.balance-label {
		font-size: 0.85rem;
		color: #444;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.15rem;
	}

	.balance-amount {
		font-size: 2rem;
		font-weight: 700;
	}

	.section {
		margin-bottom: 1rem;
	}

	.section h2 {
		font-size: 1rem;
		color: #000;
		margin-bottom: 0rem;
		font-weight: 700;
		background: #a0a0a0;
		padding: 0.2rem 0.5rem;
		border: 2px inset #ddd;
	}

	.section-desc {
		font-size: 0.85rem;
		color: #444;
		margin-bottom: 0.75rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0rem;
	}

	.section-header h2 {
		margin-bottom: 0;
	}

	.view-toggle {
		display: flex;
		gap: 0;
	}

	.toggle-btn {
		padding: 0.3rem 0.6rem;
		font-size: 0.8rem;
		border: 2px outset #ddd;
		background: #c0c0c0;
		cursor: pointer;
		font-family: inherit;
		transform: translateY(1px);
	}

	.toggle-btn:active {
		border-style: inset;
	}

	.toggle-btn.active {
		border-style: inset;
		background: #a0a0a0;
		font-weight: 700;
	}

	.user-filter-select {
		padding: 0.3rem 0.4rem;
		font-size: 0.8rem;
		border: 2px inset #ddd;
		background: #fff;
		font-family: inherit;
		cursor: pointer;
		transform: translateY(1px);
	}

	.fine-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.fine-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
	}

	.fine-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.fine-amount {
		font-weight: 700;
		font-size: 1rem;
	}

	.fine-desc {
		font-size: 0.85rem;
		color: #000;
	}

	.fine-paired {
		font-size: 0.78rem;
		color: #444;
	}

	.balance-table {
		overflow: hidden;
	}

	.table-header {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: #c0c0c0;
		font-weight: 700;
		font-size: 0.85rem;
		color: #000;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-bottom: 1px solid #808080;
	}

	.table-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #808080;
		font-size: 0.9rem;
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.col-name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.emoji {
		font-size: 1.1rem;
	}

	.col-balance {
		font-weight: 700;
	}

	.negative {
		color: #cc0000;
	}

	.positive {
		color: #008000;
	}

	.submit-payment-wrapper {
		display: flex;
		justify-content: center;
	}

	.submit-payment-btn {
		font-weight: 700;
		font-size: 1.2rem;
		padding: 0.8rem 2rem;
	}

	.btn-icon {
		height: 1em;
		width: auto;
		image-rendering: pixelated;
		vertical-align: middle;
	}

	.payment-form {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.payment-actions {
		display: flex;
		gap: 0.5rem;
	}

	.bank-details {
		border: 2px inset #ddd;
		padding: 0.5rem 0.75rem;
		background: #c0c0c0;
		font-size: 0.85rem;
	}

	.bank-details-title {
		font-weight: 700;
		margin-bottom: 0.3rem;
		font-size: 0.9rem;
	}

	.bank-details-row {
		display: flex;
		gap: 0.4rem;
		padding: 0.1rem 0;
	}

	.bank-label {
		font-weight: 700;
		min-width: 5rem;
	}

	.empty-state {
		color: #444;
		text-align: center;
		padding: 1.5rem;
		background: #c0c0c0;
		border: 2px inset #ddd;
	}

	.transaction-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.transaction-item {
		padding: 0.5rem 0.75rem;
	}

	.transaction-item.pending {
		border-left: 3px solid #806600;
	}

	.tx-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.2rem;
	}

	.tx-user {
		font-weight: 700;
		font-size: 0.9rem;
	}

	.tx-badges {
		display: flex;
		gap: 0.3rem;
	}

	.tx-status {
		background: #c0c0c0;
		color: #444;
	}

	.tx-description {
		font-size: 0.85rem;
		color: #444;
	}

	.tx-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.25rem;
	}

	.tx-amount {
		font-weight: 700;
		font-size: 0.9rem;
	}

	.tx-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.tx-date {
		font-size: 0.78rem;
		color: #444;
	}

	.approval-actions {
		display: flex;
		gap: 0.3rem;
	}

	.btn-small {
		padding: 0.2rem 0.4rem;
		font-size: 0.75rem;
	}

	.no-pending {
		font-size: 0.85rem;
		color: #444;
	}

	.admin-section {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 0.75rem;
	}

	.admin-section h2 {
		color: #000;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.edit-row {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.edit-row label {
		font-size: 0.8rem;
		color: #444;
	}

	.edit-row input,
	.edit-row select {
		padding: 0.3rem 0.4rem;
		font-size: 0.85rem;
		border: 2px inset #ddd;
		background: #fff;
		font-family: inherit;
	}

	.edit-actions {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	.btn-outline {
		background: #c0c0c0;
		border: 2px outset #ddd;
		color: #000;
	}

	.btn-secondary {
		background: #c0c0c0;
		border: 2px outset #ddd;
		color: #000;
	}
</style>
