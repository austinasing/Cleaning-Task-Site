<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { invalidateAll, goto } from '$app/navigation';
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
	let email = $state('');
	let editRole = $state('');
	let editActive = $state(true);
	let saving = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	// Section collapse state (all open by default)
	let sectionOpen = $state({
		profile: true,
		schedule: true,
		tasks: true,
		rotationOverview: true,
		userManagement: true
	});

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

	// Rotation Overview (admin only)
	const rotationOverview = $derived(data.rotationOverview);
	let overviewPeriodIndex = $state(0);

	// Initialize to the current period when rotationOverview loads
	$effect(() => {
		if (rotationOverview) {
			const currentIdx = rotationOverview.findIndex((p: any) => p.isCurrent);
			if (currentIdx >= 0) overviewPeriodIndex = currentIdx;
		}
	});

	const selectedPeriodData = $derived(rotationOverview?.[overviewPeriodIndex]);

	// Total smiles/frowns across all weeks
	const totalSmiles = $derived(
		taskHistory?.weeklyTasks?.reduce((sum: number, w: any) => sum + (w.totalSmiles || 0), 0) ?? 0
	);
	const totalFrowns = $derived(
		taskHistory?.weeklyTasks?.reduce((sum: number, w: any) => sum + (w.totalFrowns || 0), 0) ?? 0
	);

	function formatPeriodDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	}

	// Expandable state for weekly tasks (use object for better reactivity)
	let expandedWeeks = $state<Record<string, boolean>>({});

	// Admin user management state
	const allUsers = $derived(data.allUsers);
	const sortedUsers = $derived(
		allUsers?.slice().sort((a: any, b: any) => {
			// Inactive users go to the bottom
			if (a.active !== b.active) return a.active ? -1 : 1;
			// Among active: sort by team number (unassigned last)
			if (a.active) {
				const teamA = a.taskTeam ?? Infinity;
				const teamB = b.taskTeam ?? Infinity;
				if (teamA !== teamB) return teamA - teamB;
			}
			return (a.name || '').localeCompare(b.name || '');
		})
	);
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
		email = profile?.email ?? '';
		editRole = profile?.role ?? 'member';
		editActive = profile?.active ?? true;
		editing = true;
		errorMsg = '';
		successMsg = '';
	}

	async function saveProfile(e: Event) {
		e.preventDefault();
		saving = true;
		errorMsg = '';
		successMsg = '';

		const updates: Record<string, unknown> = {
			name: displayName,
			emoji,
			email
		};

		if (isPrivileged && !isOwnProfile) {
			updates.role = editRole;
			updates.active = editActive;
		}

		try {
			const res = await fetch(`/api/users/${$page.params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
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

	async function deleteUser(userId: string) {
		if (!confirm('Permanently remove this user? This cannot be undone.')) return;
		adminError = '';
		try {
			const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
			if (!res.ok) {
				const d = await res.json();
				adminError = d.error || 'Failed to remove user';
				return;
			}
			await invalidateAll();
		} catch {
			adminError = 'Network error';
		}
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		currentUser.set(null);
		goto('/login');
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
		<div class="avatar">{profile.emoji || profile.name.charAt(0)}</div>
		<h1 class="header-name">{profile.name}</h1>
		<span class="badge header-badge" class:badge-info={profile.role !== 'member'} class:badge-success={profile.role === 'member'}>
			{roleLabel(profile.role)}
		</span>
	</div>

	<!-- Profile Info -->
	<div class="card profile-section">
		<button class="section-toggle" onclick={() => (sectionOpen.profile = !sectionOpen.profile)}>
			<span>Profile</span>
			<span class="expand-icon">{sectionOpen.profile ? '▼' : '▶'}</span>
		</button>

		{#if sectionOpen.profile}
			<div class="section-body">
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
						<div class="form-group">
							<label for="email-input">Email</label>
							<input id="email-input" type="email" bind:value={email} placeholder="your@email.com" />
						</div>
						{#if isPrivileged && !isOwnProfile}
							<div class="form-group">
								<label for="role-input">Role</label>
								<select id="role-input" bind:value={editRole}>
									<option value="member">Member</option>
									<option value="accountant">Accountant</option>
									<option value="admin">Admin</option>
								</select>
							</div>
							<div class="form-group checkbox-group">
								<label>
									<input type="checkbox" bind:checked={editActive} />
									Active
								</label>
							</div>
						{/if}
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

				{#if isOwnProfile}
					<hr class="section-divider" />
					<div class="profile-actions">
						<button class="btn btn-outline" onclick={() => (showPasswordForm = !showPasswordForm)}>
							{showPasswordForm ? 'Cancel' : 'Change Password'}
						</button>
						<button class="btn btn-danger" onclick={logout}>
							Log Out
						</button>
					</div>

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
				{/if}
			</div>
		{/if}
	</div>

	<!-- Tasks Section -->
	{#if taskHistory}
		<div class="card profile-section">
			<button class="section-toggle" onclick={() => (sectionOpen.tasks = !sectionOpen.tasks)}>
				<span>Tasks</span>
				<span class="expand-icon">{sectionOpen.tasks ? '▼' : '▶'}</span>
			</button>

			{#if sectionOpen.tasks}
				<div class="section-body">
					<div class="task-stats">
						<div class="stat">
							<span class="stat-value">{taskHistory.stats?.totalCompleted ?? 0}</span>
							<span class="stat-label">Completed</span>
						</div>
						<div class="stat">
							<span class="stat-value">{taskHistory.stats?.weeksLate ?? 0}</span>
							<span class="stat-label">Late</span>
						</div>
						<div class="stat">
							<span class="stat-value">&#128578; {totalSmiles}</span>
						</div>
						<div class="stat">
							<span class="stat-value">&#128577; {totalFrowns}</span>							
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
		</div>
	{/if}

	<!-- My Schedule -->
	{#if taskSchedule && taskSchedule.length > 0}
		<div class="card profile-section">
			<button class="section-toggle" onclick={() => (sectionOpen.schedule = !sectionOpen.schedule)}>
				<span>My Schedule</span>
				<span class="expand-icon">{sectionOpen.schedule ? '▼' : '▶'}</span>
			</button>

			{#if sectionOpen.schedule}
				<div class="section-body">
					<div class="schedule-grid">
						{#each taskSchedule as slot}
							<div class="schedule-slot" class:schedule-current={slot.isCurrent}>
								<div class="schedule-task">{slot.displayName || '—'}</div>
								<div class="schedule-dates">{formatPeriodDate(slot.startDate)} – {formatPeriodDate(slot.endDate)}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Admin Rotation Overview -->
	{#if isAdmin && isOwnProfile && rotationOverview && selectedPeriodData}
		<div class="card profile-section">
			<button class="section-toggle" onclick={() => (sectionOpen.rotationOverview = !sectionOpen.rotationOverview)}>
				<span>Rotation Overview</span>
				<span class="expand-icon">{sectionOpen.rotationOverview ? '▼' : '▶'}</span>
			</button>

			{#if sectionOpen.rotationOverview}
				<div class="section-body">
					<div class="overview-nav">
						<button
							class="btn btn-sm btn-outline"
							disabled={overviewPeriodIndex === 0}
							onclick={() => overviewPeriodIndex--}
						>
							&larr; Prev
						</button>
						<span class="overview-period-label">
							Period {selectedPeriodData.period}
							{#if selectedPeriodData.isCurrent}
								<span class="badge badge-info">Current</span>
							{/if}
						</span>
						<button
							class="btn btn-sm btn-outline"
							disabled={overviewPeriodIndex === rotationOverview.length - 1}
							onclick={() => overviewPeriodIndex++}
						>
							Next &rarr;
						</button>
					</div>
					<div class="overview-grid">
						{#each selectedPeriodData.assignments as assignment}
							<div class="overview-card">
								<div class="overview-team">Group {assignment.team}</div>
								<div class="overview-task">{assignment.displayName || '—'}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Admin User Management -->
	{#if isAdmin && isOwnProfile && allUsers}
		<div class="card profile-section admin-section">
			<button class="section-toggle" onclick={() => (sectionOpen.userManagement = !sectionOpen.userManagement)}>
				<span>User Management</span>
				<span class="expand-icon">{sectionOpen.userManagement ? '▼' : '▶'}</span>
			</button>

			{#if sectionOpen.userManagement}
				<div class="section-body">
					{#if adminError}<div class="error-message">{adminError}</div>{/if}
					{#if adminSuccess}<div class="success-message">{adminSuccess}</div>{/if}

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

					<div class="users-table-wrapper">
						<table class="users-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Task Group</th>
									<th>Team</th>
									<th>Status</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{#each sortedUsers as user, i (user._id)}
									{@const currentTaskGroup = getCurrentTaskGroup(user)}
									{@const hasOverride = getUserOverrideTaskGroup(user._id) !== undefined}
									{@const prevUser = sortedUsers[i - 1]}
									{@const normalTeam = user.taskTeam ?? null}
									{@const prevNormalTeam = prevUser ? (prevUser.taskTeam ?? null) : undefined}
									{#if !user.active && prevUser?.active !== false}
										<tr class="team-header-row deactivated-header">
											<td colspan="5">inactive</td>
										</tr>
									{:else if user.active && normalTeam !== prevNormalTeam}
										<tr class="team-header-row">
											<td colspan="5">Team {user.taskTeam ?? 'Unassigned'}</td>
										</tr>
									{/if}
									<tr class:inactive={!user.active}>
										<td data-label="Name" class="user-name">
											{user.emoji || ''} {user.name}
										</td>
										{#if user.active}
											<td data-label="Task Group" class="task-group-cell">
												<div class="task-group-wrapper">
													<div class="task-group-display">
														{currentTaskGroup?.displayName || '—'}
														{#if hasOverride}
															<span class="override-icon" title="Task override active">&#x1f512;</span>
														{/if}
													</div>
													<div class="task-group-overlay">
														{#if hasOverride}
															<button
																class="btn btn-sm btn-reset"
																onclick={() => removeOverride(user._id)}
															>
																Remove Override
															</button>
														{:else}
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
										{:else}
											<td class="inactive-group-cell"></td>
										{/if}
										<td data-label="Team">
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
										<td data-label="Status">
											<select
												value={user.active ? 'active' : 'inactive'}
												onchange={(e) => updateUser(user._id, { active: e.currentTarget.value === 'active' })}
												class="status-select"
											>
												<option value="active">Active</option>
												<option value="inactive">inactive</option>
											</select>
										</td>
										<td>
											<div class="action-cell">
												<a href="/users/{user._id}" class="btn btn-sm btn-outline view-link">
													View
												</a>
												{#if !user.active}
													<button
														class="btn btn-sm btn-danger remove-btn"
														onclick={() => deleteUser(user._id)}
														title="Remove user"
													>
														&times;
													</button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>

		<!-- Override Task Modal (outside section-body so it can use fixed positioning) -->
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
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.avatar {
		width: 36px;
		height: 36px;
		background: #000080;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		font-weight: 600;
		border: 2px outset #ddd;
		flex-shrink: 0;
	}

	.header-name {
		height: 36px;
		font-size: 1.1rem;
		color: #000;
		background: #c0c0c0;
		border: 2px inset #ddd;
		padding: 0 0.5rem;
		display: flex;
		align-items: center;
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-badge {
		height: 36px;
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
		flex-shrink: 0;
	}

	.profile-section {
		padding: 0;
		margin-bottom: 0.75rem;
		overflow: hidden;
	}

	.section-toggle {
		width: 100%;
		padding: 0.6rem 1rem;
		background: #c0c0c0;
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		font-family: inherit;
		font-size: 1rem;
		font-weight: 700;
		color: #000;
	}

	.section-toggle:hover {
		background: #d0d0d0;
	}

	.section-body {
		padding: 1rem;
		border-top: 1px solid #808080;
	}

	.section-divider {
		border: none;
		border-top: 1px solid #808080;
		margin: 0.75rem 0;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.info-label {
		font-size: 0.78rem;
		color: var(--color-text-muted, #444);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.info-value {
		font-size: 0.9rem;
		font-weight: 400;
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
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		text-align: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #808080;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		color: #000;
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--color-text-muted, #444);
		text-transform: uppercase;
	}

	.no-data {
		color: var(--color-text-muted, #444);
		font-size: 0.9rem;
		text-align: center;
		padding: 1rem 0;
	}

	/* Task Schedule */
	.schedule-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 3px;
	}

	.schedule-slot {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 0.25rem 0.15rem;
		text-align: center;
	}

	.schedule-current {
		border-style: inset;
		background: #a0a0a0;
	}

	.schedule-task {
		font-size: 0.65rem;
		font-weight: 700;
		color: #000;
		line-height: 1.2;
	}

	.schedule-dates {
		font-size: 0.55rem;
		color: #333;
		line-height: 1.2;
		margin-top: 0.15rem;
	}

	/* Weekly Tasks */
	.weekly-tasks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.week-item {
		border: 2px outset #ddd;
		overflow: hidden;
	}

	.week-header {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: #c0c0c0;
		border: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		font-family: inherit;
	}

	.week-header:hover {
		background: #d0d0d0;
	}

	.week-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.week-label {
		font-weight: 700;
		font-size: 0.9rem;
		color: #000;
	}

	.week-count {
		font-size: 0.8rem;
		color: var(--color-text-muted, #444);
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
		background: #c0c0c0;
		border-top: 1px solid #808080;
	}

	.subtask-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #808080;
	}

	.subtask-item:last-child {
		border-bottom: none;
	}

	.subtask-item.late {
		background: rgba(230, 126, 34, 0.04);
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
		display: flex;
		align-items: center;
		gap: 0.1rem;
	}

	.feedback-badge.smile {
		color: var(--color-success, #008000);
	}

	.feedback-badge.frown {
		color: var(--color-danger, #cc0000);
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
		padding: 0.4rem 0.5rem;
		border: 2px inset #ddd;
		font-size: 0.9rem;
		font-family: inherit;
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
		padding: 0.5rem 0.4rem;
		text-align: left;
		border-bottom: 1px solid #808080;
	}

	.users-table th {
		font-weight: 700;
		color: #000;
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.03em;
		background: #c0c0c0;
	}

	.users-table tr.inactive {
		opacity: 0.5;
	}

	.team-header-row td {
		background: #a0a0a0;
		font-weight: 700;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #000;
		padding: 0.3rem 0.4rem;
		border-bottom: 1px solid #808080;
	}

	.deactivated-header td {
		background: #808080;
		color: #fff;
	}

	.user-name {
		font-weight: 500;
		white-space: nowrap;
	}

	.users-table select {
		padding: 0.25rem 0.4rem;
		border: 2px inset #ddd;
		font-size: 0.8rem;
		background: white;
		font-family: inherit;
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
		transition: opacity 0.2s;
	}

	.override-icon {
		font-size: 0.85em;
		cursor: help;
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
		background: rgba(192, 192, 192, 0.95);
	}

	.task-group-wrapper:hover .task-group-overlay {
		opacity: 1;
	}

	.task-group-wrapper:hover .task-group-display {
		opacity: 0;
	}

	.btn-override {
		background: #c0c0c0;
		color: #806600;
		border: 2px outset #ddd;
		white-space: nowrap;
		font-weight: 700;
	}

	.btn-reset {
		background: #c0c0c0;
		color: #000080;
		border: 2px outset #ddd;
		white-space: nowrap;
		font-weight: 700;
	}

	/* Rotation Overview */
	.overview-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		gap: 0.5rem;
	}

	.overview-period-label {
		font-weight: 700;
		font-size: 1rem;
		color: #000;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.5rem;
	}

	.overview-card {
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 0.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.overview-team {
		font-size: 0.75rem;
		color: var(--color-text-muted, #718096);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-weight: 600;
	}

	.overview-task {
		font-size: 0.9rem;
		font-weight: 600;
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
		background: #c0c0c0;
		border: 2px outset #ddd;
		padding: 1.25rem;
		max-width: 500px;
		width: 90%;
	}

	.modal h3 {
		margin-top: 0;
		margin-bottom: 1rem;
	}

	.modal p {
		margin-bottom: 1rem;
		color: var(--color-text-muted, #444);
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

	.action-cell {
		display: flex;
		gap: 0.3rem;
		align-items: center;
	}

	.status-select {
		padding: 0.25rem 0.4rem;
		border: 2px inset #ddd;
		font-size: 0.8rem;
		background: white;
		font-family: inherit;
	}

	.remove-btn {
		padding: 0 0.4rem;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.profile-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	@media (max-width: 480px) {
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
