<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	const profile = $derived(data.profile);
	const isOwnProfile = $derived($currentUser?.userId === $page.params.id);
	const isPrivileged = $derived(
		$currentUser?.role === 'admin' || $currentUser?.role === 'accountant'
	);

	// Edit state
	let editing = $state(false);
	let displayName = $state('');
	let emoji = $state('');
	let emailNotifications = $state(false);
	let saving = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	// Password change state
	let showPasswordForm = $state(false);
	let pwEmail = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let pwSaving = $state(false);
	let pwError = $state('');
	let pwSuccess = $state('');

	// Task History
	const taskHistory = $derived(data.taskHistory);

	// Task Schedule
	const taskSchedule = $derived(data.taskSchedule);

	const TASK_COLORS: Record<string, string> = {
		kitchen_fri: '#e67e22',
		kitchen_mon: '#d35400',
		toilet_front: '#3498db',
		toilet_back: '#2980b9',
		bathroom: '#9b59b6',
		hallway: '#27ae60',
		garbage: '#7f8c8d',
		reserve: '#95a5a6',
		supplies: '#1abc9c'
	};

	function formatPeriodDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}

	// Expandable state for weekly tasks (use object for better reactivity)
	let expandedWeeks = $state<Record<string, boolean>>({});

	// Admin user management state
	const allUsers = $derived(data.allUsers);
	const taskGroups = $derived(data.taskGroups || []);
	const isAdmin = $derived($currentUser?.role === 'admin');
	let newUserName = $state('');
	let addingUser = $state(false);
	let adminError = $state('');
	let adminSuccess = $state('');

	// Helper to find which task group a user has an override for
	function getUserOverrideTaskGroup(userId: string) {
		return taskGroups.find((g: any) =>
			g.members.some((m: any) => m.userId === userId)
		);
	}

	// Helper to get the current task group for a user (override or rotation)
	function getCurrentTaskGroup(user: any) {
		// Check for override first
		const overrideGroup = getUserOverrideTaskGroup(user._id);
		if (overrideGroup) return overrideGroup;

		// Use server-computed rotation task group (single source of truth)
		if (user._rotationTaskGroup) return user._rotationTaskGroup;

		return null;
	}

	async function addUser(e: Event) {
		e.preventDefault();
		if (!newUserName.trim()) return;

		addingUser = true;
		adminError = '';
		adminSuccess = '';

		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newUserName.trim() })
			});

			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to create user';
				return;
			}

			adminSuccess = `User "${newUserName.trim()}" created!`;
			newUserName = '';
			await invalidateAll();
		} finally {
			addingUser = false;
		}
	}

	async function updateUser(userId: string, updates: Record<string, unknown>) {
		adminError = '';
		adminSuccess = '';

		try {
			const res = await fetch(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to update user';
				return;
			}

			await invalidateAll();
		} catch {
			adminError = 'Network error';
		}
	}

	async function updateTaskGroup(userId: string, taskGroupId: string) {
		adminError = '';
		adminSuccess = '';

		try {
			const res = await fetch(`/api/admin/users/${userId}/taskgroup`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskGroupId })
			});

			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to update task group';
				return;
			}

			await invalidateAll();
		} catch {
			adminError = 'Network error';
		}
	}

	// Lock/unlock user task assignment
	let lockModalUser: any = $state(null);

	function showLockModal(user: any) {
		lockModalUser = user;
	}

	async function lockUserToTask(userId: string, taskGroupId: string) {
		adminError = '';
		try {
			const res = await fetch(`/api/admin/users/${userId}/lock-task`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskGroupId })
			});

			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to lock user';
				return;
			}

			lockModalUser = null;
			await invalidateAll();
		} catch {
			adminError = 'Network error';
		}
	}

	async function removeOverride(userId: string) {
		adminError = '';
		try {
			const res = await fetch(`/api/admin/users/${userId}/lock-task`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to remove override';
				return;
			}

			await invalidateAll();
		} catch {
			adminError = 'Network error';
		}
	}

	function startEditing() {
		displayName = profile?.name ?? '';
		emoji = profile?.emoji ?? '';
		emailNotifications = profile?.preferences?.emailNotifications ?? false;
		editing = true;
		errorMsg = '';
		successMsg = '';
	}

	async function saveProfile(e: Event) {
		e.preventDefault();
		saving = true;
		errorMsg = '';
		successMsg = '';

		try {
			const res = await fetch(`/api/users/${$page.params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: displayName,
					emoji,
					preferences: { emailNotifications }
				})
			});

			if (!res.ok) {
				const d = await res.json();
				errorMsg = d.error || 'Failed to save';
				return;
			}

			successMsg = 'Profile updated!';
			editing = false;
			await invalidateAll();
		} finally {
			saving = false;
		}
	}

	async function changePassword(e: Event) {
		e.preventDefault();
		pwError = '';
		pwSuccess = '';

		if (newPassword !== confirmPassword) {
			pwError = 'Passwords do not match.';
			return;
		}
		if (newPassword.length < 6) {
			pwError = 'Password must be at least 6 characters.';
			return;
		}

		pwSaving = true;

		try {
			const res = await fetch(`/api/users/${$page.params.id}/password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: pwEmail, newPassword })
			});

			if (!res.ok) {
				const d = await res.json();
				pwError = d.error || 'Failed to change password';
				return;
			}

			pwSuccess = 'Password updated!';
			pwEmail = '';
			newPassword = '';
			confirmPassword = '';
			showPasswordForm = false;
		} finally {
			pwSaving = false;
		}
	}

	function roleLabel(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}

	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function toggleWeek(weekId: string) {
		expandedWeeks[weekId] = !expandedWeeks[weekId];
	}
</script>

<svelte:head>
	<title>{profile?.name ?? 'Profile'}</title>
</svelte:head>

{#if profile}
	<div class="profile-header">
		<div class="avatar">
			{profile.emoji || profile.name.charAt(0)}
		</div>
		<div class="header-info">
			<h1>{profile.name}</h1>
			<span class="badge" class:badge-info={profile.role !== 'member'} class:badge-success={profile.role === 'member'}>
				{roleLabel(profile.role)}
			</span>
		</div>
	</div>

	<!-- Profile Info -->
	<div class="card profile-section">
		<h2>Profile</h2>

		{#if errorMsg}<div class="error-message">{errorMsg}</div>{/if}
		{#if successMsg}<div class="success-message">{successMsg}</div>{/if}

		{#if editing}
			<form onsubmit={saveProfile}>
				<div class="form-group">
					<label for="name-input">Display Name</label>
					<input id="name-input" type="text" bind:value={displayName} placeholder="Your name" minlength="2" required />
				</div>
				<div class="form-group">
					<label for="emoji-input">Emoji</label>
					<input id="emoji-input" type="text" bind:value={emoji} placeholder="Pick an emoji" maxlength="4" />
				</div>
				<div class="form-group checkbox-group">
					<label>
						<input type="checkbox" bind:checked={emailNotifications} />
						Email notifications
					</label>
				</div>
				<div class="form-actions">
					<button class="btn btn-primary" type="submit" disabled={saving}>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<button class="btn btn-outline" type="button" onclick={() => (editing = false)}>
						Cancel
					</button>
				</div>
			</form>
		{:else}
			<div class="info-grid">
				<div class="info-item">
					<span class="info-label">Display Name</span>
					<span class="info-value">{profile.name}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Email</span>
					<span class="info-value">{profile.email || 'Not set'}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Emoji</span>
					<span class="info-value">{profile.emoji || 'None'}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Email Notifications</span>
					<span class="info-value">{profile.preferences?.emailNotifications ? 'On' : 'Off'}</span>
				</div>
				<div class="info-item">
					<span class="info-label">Status</span>
					<span class="info-value">
						<span class="badge" class:badge-success={profile.active} class:badge-danger={!profile.active}>
							{profile.active ? 'Active' : 'Inactive'}
						</span>
					</span>
				</div>
			</div>

			{#if isOwnProfile || isPrivileged}
				<button class="btn btn-outline edit-btn" onclick={startEditing}>
					Edit Profile
				</button>
			{/if}
		{/if}
	</div>

	<!-- Task Schedule -->
	{#if taskSchedule && taskSchedule.length > 0}
		<div class="card profile-section">
			<h2>Task Schedule</h2>
			<div class="schedule-strip">
				{#each taskSchedule as slot, i}
					<div
						class="schedule-slot"
						class:schedule-current={slot.isCurrent}
						style="--slot-color: {TASK_COLORS[slot.taskGroupName] || '#bdc3c7'}"
					>
						<div class="schedule-dates">
							{formatPeriodDate(slot.startDate)} – {formatPeriodDate(slot.endDate)}
						</div>
						<div class="schedule-task">
							{slot.displayName || '—'}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tasks Section -->
	{#if taskHistory}
		<div class="card profile-section">
			<h2>Tasks</h2>
			<div class="task-stats">
				<div class="stat">
					<span class="stat-value">{taskHistory.stats?.totalCompleted ?? 0}</span>
					<span class="stat-label">Tasks Completed</span>
				</div>
				<div class="stat">
					<span class="stat-value">{taskHistory.stats?.weeksLate ?? 0}</span>
					<span class="stat-label">Late Count</span>
				</div>
			</div>

			{#if taskHistory.weeklyTasks && taskHistory.weeklyTasks.length > 0}
				<div class="weekly-tasks">
					{#each taskHistory.weeklyTasks as week (week.weekId)}
						{@const isExpanded = expandedWeeks[week.weekId]}
						<div class="week-item">
							<button class="week-header" onclick={() => toggleWeek(week.weekId)}>
								<div class="week-info">
									<span class="week-label">Week {week.weekNumber}, {week.year}</span>
									<span class="week-count">{week.completedSubtasks.length} task{week.completedSubtasks.length !== 1 ? 's' : ''}</span>
									{#if week.totalSmiles > 0 || week.totalFrowns > 0}
										<span class="week-feedback">
											{#if week.totalSmiles > 0}<span class="feedback-item smile">&#128578; {week.totalSmiles}</span>{/if}
											{#if week.totalFrowns > 0}<span class="feedback-item frown">&#128577; {week.totalFrowns}</span>{/if}
										</span>
									{/if}
								</div>
								<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
							</button>

							{#if isExpanded}
								<div class="week-subtasks">
									{#each week.completedSubtasks as subtask}
										<div class="subtask-item" class:late={subtask.daysLate > 0}>
											<span class="subtask-name">{subtask.subtaskName}</span>
											<span class="subtask-group">{subtask.taskGroupName}</span>
											{#if subtask.smiles > 0 || subtask.frowns > 0}
												<span class="subtask-feedback">
													{#if subtask.smiles > 0}<span class="feedback-badge smile">&#128578; {subtask.smiles}</span>{/if}
													{#if subtask.frowns > 0}<span class="feedback-badge frown">&#128577; {subtask.frowns}</span>{/if}
												</span>
											{/if}
											{#if subtask.daysLate > 0}
												<span class="badge badge-warning">{subtask.daysLate}d late</span>
											{:else}
												<span class="badge badge-success">On time</span>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="no-data">No completed tasks yet.</p>
			{/if}
		</div>
	{/if}

	<!-- Password Change -->
	{#if isOwnProfile}
		<div class="card profile-section">
			<h2>Security</h2>
			<button class="btn btn-outline" onclick={() => (showPasswordForm = !showPasswordForm)}>
				{showPasswordForm ? 'Cancel' : 'Change Password'}
			</button>

			{#if showPasswordForm}
				<form onsubmit={changePassword} class="password-form">
					{#if pwError}<div class="error-message">{pwError}</div>{/if}
					{#if pwSuccess}<div class="success-message">{pwSuccess}</div>{/if}
					<div class="form-group">
						<label for="pw-email">Verify Email</label>
						<input id="pw-email" type="email" bind:value={pwEmail} required placeholder="Your account email" />
					</div>
					<div class="form-group">
						<label for="pw-new">New Password</label>
						<input id="pw-new" type="password" bind:value={newPassword} required minlength="6" />
					</div>
					<div class="form-group">
						<label for="pw-confirm">Confirm New Password</label>
						<input id="pw-confirm" type="password" bind:value={confirmPassword} required minlength="6" />
					</div>
					<button class="btn btn-primary" type="submit" disabled={pwSaving}>
						{pwSaving ? 'Updating...' : 'Update Password'}
					</button>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Admin User Management -->
	{#if isAdmin && isOwnProfile && allUsers}
		<div class="card profile-section admin-section">
			<h2>User Management</h2>

			{#if adminError}<div class="error-message">{adminError}</div>{/if}
			{#if adminSuccess}<div class="success-message">{adminSuccess}</div>{/if}

			<!-- Add New User -->
			<form onsubmit={addUser} class="add-user-form">
				<input
					type="text"
					bind:value={newUserName}
					placeholder="New user name"
					minlength="2"
					disabled={addingUser}
				/>
				<button class="btn btn-primary" type="submit" disabled={addingUser || !newUserName.trim()}>
					{addingUser ? 'Adding...' : 'Add User'}
				</button>
			</form>

			<!-- Users Table -->
			<div class="users-table-wrapper">
				<table class="users-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Role</th>
							<th>Task Group</th>
							<th>Team</th>
							<th>Status</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each allUsers as user (user._id)}
							{@const currentTaskGroup = getCurrentTaskGroup(user)}
							{@const hasOverride = getUserOverrideTaskGroup(user._id) !== undefined}
							<tr class:inactive={!user.active}>
								<td class="user-name">
									{user.emoji || ''} {user.name}
								</td>
								<td class="user-email">
									{user.email || '—'}
								</td>
								<td>
									<select
										value={user.role}
										onchange={(e) => updateUser(user._id, { role: e.currentTarget.value })}
										disabled={user._id === $currentUser?.userId}
									>
										<option value="member">Member</option>
										<option value="accountant">Accountant</option>
										<option value="admin">Admin</option>
									</select>
								</td>
								<td class="task-group-cell">
									<div class="task-group-wrapper">
										<div class="task-group-display">
											{currentTaskGroup?.displayName || '—'}
										</div>
										<div class="task-group-overlay">
											{#if hasOverride}
												<!-- User has override, show remove button -->
												<button
													class="btn btn-sm btn-reset"
													onclick={() => removeOverride(user._id)}
												>
													Remove Override
												</button>
											{:else}
												<!-- User is rotating, show override button -->
												<button
													class="btn btn-sm btn-override"
													onclick={() => showLockModal(user)}
												>
													Override Task
												</button>
											{/if}
										</div>
									</div>
								</td>
								<td>
									<select
										value={user.taskTeam ?? ''}
										onchange={(e) => {
											const val = e.currentTarget.value;
											updateUser(user._id, { taskTeam: val === '' ? null : parseInt(val, 10) });
										}}
									>
										<option value="">—</option>
										{#each [1, 2, 3, 4, 5, 6, 7, 8] as team}
											<option value={team}>{team}</option>
										{/each}
									</select>
								</td>
								<td>
									<button
										class="btn btn-sm"
										class:btn-success={!user.active}
										class:btn-danger={user.active}
										onclick={() => updateUser(user._id, { active: !user.active })}
										disabled={user._id === $currentUser?.userId}
									>
										{user.active ? 'Deactivate' : 'Activate'}
									</button>
								</td>
								<td>
									<a href="/users/{user._id}" class="btn btn-sm btn-outline view-link">
										View
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Override Task Modal -->
			{#if lockModalUser}
				<div class="modal-overlay" onclick={() => (lockModalUser = null)}>
					<div class="modal" onclick={(e) => e.stopPropagation()}>
						<h3>Override Task Assignment for {lockModalUser.name}</h3>
						<p>Select which task group to assign this user to (overrides team rotation):</p>
						<div class="modal-buttons">
							{#each taskGroups as group (group._id)}
								<button
									class="btn btn-primary"
									onclick={() => lockUserToTask(lockModalUser._id, group._id)}
								>
									{group.displayName}
								</button>
							{/each}
							<button class="btn btn-outline" onclick={() => (lockModalUser = null)}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{:else}
	<div class="no-profile">
		<h2>User Not Found</h2>
		<p><a href="/">Back to tasks</a></p>
	</div>
{/if}

<style>
	.profile-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-primary, #2c3e50);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.header-info h1 {
		font-size: 1.4rem;
		color: var(--color-primary, #2c3e50);
		margin-bottom: 0.1rem;
	}

	.profile-section {
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.profile-section h2 {
		font-size: 1rem;
		color: var(--color-primary, #2c3e50);
		margin-bottom: 0.75rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.info-label {
		font-size: 0.78rem;
		color: var(--color-text-muted, #718096);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.info-value {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.edit-btn {
		margin-top: 0.25rem;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.task-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		text-align: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border, #e2e8f0);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.stat-value {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-primary, #2c3e50);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted, #718096);
		text-transform: uppercase;
	}

	.no-data {
		color: var(--color-text-muted, #718096);
		font-size: 0.9rem;
		text-align: center;
		padding: 1rem 0;
	}

	/* Task Schedule */
	.schedule-strip {
		display: flex;
		gap: 3px;
	}

	.schedule-slot {
		flex: 1;
		min-width: 0;
		border-radius: 6px;
		overflow: hidden;
		background: white;
		border: 2px solid var(--slot-color, #bdc3c7);
	}

	.schedule-current {
		border-width: 2px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	.schedule-dates {
		padding: 0.2rem 0.15rem;
		font-size: 0.55rem;
		color: white;
		background: var(--slot-color, #bdc3c7);
		text-align: center;
		font-weight: 500;
		line-height: 1.2;
	}

	.schedule-task {
		padding: 0.25rem 0.15rem;
		font-size: 0.62rem;
		font-weight: 600;
		text-align: center;
		color: var(--slot-color, #555);
		line-height: 1.2;
	}

	.schedule-current .schedule-task::after {
		content: '\25CF';
		display: block;
		font-size: 0.45rem;
		color: var(--slot-color, #555);
		opacity: 0.6;
	}

	/* Weekly Tasks */
	.weekly-tasks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.week-item {
		border: 1px solid var(--color-border, #e2e8f0);
		border-radius: 6px;
		overflow: hidden;
	}

	.week-header {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-bg-subtle, #f8f9fa);
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: background 0.15s;
	}

	.week-header:hover {
		background: var(--color-bg, #f0f0f0);
	}

	.week-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.week-label {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-primary, #2c3e50);
	}

	.week-count {
		font-size: 0.8rem;
		color: var(--color-text-muted, #718096);
	}

	.week-feedback {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.feedback-item {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.feedback-item.smile {
		color: var(--color-success, #27ae60);
	}

	.feedback-item.frown {
		color: var(--color-danger, #e74c3c);
	}

	.expand-icon {
		font-size: 0.7rem;
		color: var(--color-text-muted, #718096);
		transition: transform 0.2s;
	}

	.week-subtasks {
		padding: 0.5rem;
		background: white;
	}

	.subtask-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border, #f0f0f0);
	}

	.subtask-item:last-child {
		border-bottom: none;
	}

	.subtask-item.late {
		background: rgba(230, 126, 34, 0.02);
	}

	.subtask-name {
		font-weight: 500;
		font-size: 0.85rem;
		flex: 1;
	}

	.subtask-group {
		font-size: 0.75rem;
		color: var(--color-text-muted, #718096);
		margin-right: 0.5rem;
	}

	.subtask-feedback {
		display: flex;
		gap: 0.35rem;
		margin-right: 0.5rem;
	}

	.feedback-badge {
		font-size: 0.7rem;
		padding: 0.1rem 0.3rem;
		border-radius: 999px;
		display: flex;
		align-items: center;
		gap: 0.1rem;
	}

	.feedback-badge.smile {
		background: rgba(39, 174, 96, 0.1);
		color: var(--color-success, #27ae60);
	}

	.feedback-badge.frown {
		background: rgba(231, 76, 60, 0.1);
		color: var(--color-danger, #e74c3c);
	}

	.password-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.no-profile {
		text-align: center;
		padding: 4rem 1rem;
	}

	.no-profile a {
		color: var(--color-accent, #3498db);
	}

	/* Admin section styles */
	.admin-section {
		margin-top: 1.5rem;
	}

	.add-user-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.add-user-form input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 6px;
		font-size: 0.9rem;
	}

	.users-table-wrapper {
		overflow-x: auto;
		margin: 0 -1.25rem;
		padding: 0 1.25rem;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.users-table th,
	.users-table td {
		padding: 0.6rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border, #eee);
	}

	.users-table th {
		font-weight: 600;
		color: var(--color-text-muted, #718096);
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.03em;
	}

	.users-table tr.inactive {
		opacity: 0.5;
	}

	.user-name {
		font-weight: 500;
		white-space: nowrap;
	}

	.user-email {
		color: var(--color-text-muted, #718096);
		font-size: 0.8rem;
	}

	.users-table select {
		padding: 0.3rem 0.5rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 4px;
		font-size: 0.8rem;
		background: white;
	}

	.btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.btn-success {
		background: var(--color-success, #27ae60);
		color: white;
		border: none;
	}

	.btn-danger {
		background: var(--color-danger, #e74c3c);
		color: white;
		border: none;
	}

	.view-link {
		text-decoration: none;
		display: inline-block;
	}

	/* Task Group Cell with Hover Overlay */
	.task-group-cell {
		position: relative;
	}

	.task-group-wrapper {
		position: relative;
		min-height: 2rem;
	}

	.task-group-display {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		transition: opacity 0.2s;
	}

	.task-group-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 4px;
	}

	.task-group-wrapper:hover .task-group-overlay {
		opacity: 1;
	}

	.task-group-wrapper:hover .task-group-display {
		opacity: 0;
	}

	.btn-override {
		background: var(--color-warning, #f39c12);
		color: white;
		border: none;
		white-space: nowrap;
	}

	.btn-reset {
		background: var(--color-info, #3498db);
		color: white;
		border: none;
		white-space: nowrap;
	}

	/* Modal Styles */
	.modal-overlay {
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
	}

	.modal {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal h3 {
		margin-top: 0;
		margin-bottom: 1rem;
	}

	.modal p {
		margin-bottom: 1rem;
		color: var(--color-text-muted, #718096);
	}

	.modal-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.modal-buttons .btn {
		flex: 1 1 auto;
		min-width: 100px;
	}

	@media (max-width: 480px) {
		.info-grid {
			grid-template-columns: 1fr;
		}
		.task-stats {
			grid-template-columns: 1fr 1fr;
		}

		.add-user-form {
			flex-direction: column;
		}

		.users-table {
			font-size: 0.8rem;
		}
		.users-table th,
		.users-table td {
			padding: 0.5rem 0.3rem;
		}
	}
</style>
