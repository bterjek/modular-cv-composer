<script lang="ts">
	let { data, form } = $props();
	const fmt = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
	const userEmail = (id: string) => data.users.find((u) => u.id === id)?.email ?? id;
	const msg = (section: string) => (form?.section === section ? form : null);
</script>

<svelte:head><title>Admin · Modular CV Composer</title></svelte:head>

{#snippet feedbackFor(section: string)}
	{@const m = msg(section)}
	{#if m && 'error' in m && m.error}<p class="msg error" role="alert">{m.error}</p>{/if}
	{#if m && 'ok' in m && m.ok}<p class="msg ok" role="status">{m.ok}</p>{/if}
{/snippet}

<section class="window" id="invites">
	<h2>Invite codes</h2>
	{@render feedbackFor('invites')}
	{#if form?.section === 'invites' && 'code' in form && form.code}
		<p class="msg ok" role="status">New code — copy it now, it will not be shown again:</p>
		<code class="code">{form.code}</code>
		<p class="hint">Sign-up link:</p>
		<code class="code">{form.url}</code>
	{/if}
	<form method="POST" action="?/createInvite">
		<div class="row">
			<div><label for="inv-role">Role</label>
				<select id="inv-role" name="role">{#each data.roles as r}<option selected={r === 'tester'}>{r}</option>{/each}</select></div>
			<div><label for="inv-email">Only for e-mail (optional)</label><input id="inv-email" name="email" type="email" /></div>
			<div><label for="inv-uses">Max uses</label><input id="inv-uses" name="maxUses" type="number" min="1" max="1000" value="1" /></div>
			<div><label for="inv-days">Expires in days (blank = never)</label><input id="inv-days" name="expiresInDays" type="number" min="1" value="14" /></div>
		</div>
		<label for="inv-note">Note (who is it for?)</label>
		<input id="inv-note" name="note" maxlength="200" />
		<button class="primary">Create invite</button>
	</form>
	<div class="scroll">
		<table>
			<thead><tr><th>Created</th><th>Role</th><th>For</th><th>Note</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead>
			<tbody>
				{#each data.invites as i (i.id)}
					<tr>
						<td>{fmt(i.createdAt)}</td><td>{i.role}</td><td>{i.email ?? 'anyone'}</td><td>{i.note ?? ''}</td>
						<td>{i.uses}/{i.maxUses}</td><td>{fmt(i.expiresAt)}</td><td>{i.status}</td>
						<td>{#if i.status === 'active'}
							<form method="POST" action="?/revokeInvite"><input type="hidden" name="id" value={i.id} /><button class="small danger">Revoke</button></form>
						{/if}</td>
					</tr>
				{:else}<tr><td colspan="8" class="muted">No invites yet.</td></tr>{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="window" id="users">
	<h2>Users</h2>
	{@render feedbackFor('users')}
	{#if form?.section === 'users' && 'code' in form && form.code}
		<p class="msg ok" role="status">Reset code for {form.resetFor} (valid 24 h, shown once). They enter it at /reset:</p>
		<code class="code">{form.code}</code>
	{/if}
	<div class="scroll">
		<table>
			<thead><tr><th>Name</th><th>E-mail</th><th>Role</th><th>Joined</th><th>Last login</th><th>Status</th><th>Actions</th></tr></thead>
			<tbody>
				{#each data.users as u (u.id)}
					<tr>
						<td>{u.name}</td><td>{u.email}</td>
						<td>
							<form method="POST" action="?/setRole" class="row">
								<input type="hidden" name="id" value={u.id} />
								<select name="role" aria-label="Role for {u.email}">{#each data.roles as r}<option selected={r === u.role}>{r}</option>{/each}</select>
								<button class="small auto">Save</button>
							</form>
						</td>
						<td>{fmt(u.createdAt)}</td><td>{fmt(u.lastLoginAt)}</td><td>{u.disabledAt ? 'disabled' : 'active'}</td>
						<td class="row">
							<form method="POST" action="?/setDisabled">
								<input type="hidden" name="id" value={u.id} /><input type="hidden" name="disabled" value={u.disabledAt ? 'false' : 'true'} />
								<button class="small">{u.disabledAt ? 'Enable' : 'Disable'}</button>
							</form>
							<form method="POST" action="?/issueReset">
								<input type="hidden" name="id" value={u.id} /><input type="hidden" name="email" value={u.email} />
								<button class="small">Reset code</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="window" id="flags">
	<h2>Feature flags</h2>
	{@render feedbackFor('flags')}
	<div class="scroll">
		<table>
			<thead><tr><th>Flag</th><th>What</th><th>Everyone</th><th>Per-user overrides</th></tr></thead>
			<tbody>
				{#each data.flags as fl (fl.key)}
					<tr>
						<td>{fl.key}</td><td>{fl.description}</td>
						<td>
							<form method="POST" action="?/setFlag">
								<input type="hidden" name="key" value={fl.key} /><input type="hidden" name="enabled" value={fl.enabled ? 'false' : 'true'} />
								<button class="small">{fl.enabled ? 'ON → turn off' : 'OFF → turn on'}</button>
							</form>
						</td>
						<td>{#each fl.overrides as o}<div>{userEmail(o.userId)}: {o.enabled ? 'on' : 'off'}</div>{:else}<span class="muted">none</span>{/each}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<form method="POST" action="?/setOverride" class="row">
		<div><label for="ov-key">Flag</label><select id="ov-key" name="key">{#each data.flags as fl}<option>{fl.key}</option>{/each}</select></div>
		<div><label for="ov-user">User</label><select id="ov-user" name="userId">{#each data.users as u}<option value={u.id}>{u.email}</option>{/each}</select></div>
		<div><label for="ov-val">Override</label>
			<select id="ov-val" name="value"><option value="on">on</option><option value="off">off</option><option value="clear">clear (follow everyone)</option></select></div>
		<div class="auto"><button>Save override</button></div>
	</form>
</section>

<section class="window" id="feedback">
	<h2>Tester feedback</h2>
	{@render feedbackFor('feedback')}
	<p class="filter">Show:
		{#each ['open', 'done', 'all'] as f}<a href="?feedback={f}#feedback" aria-current={data.feedbackShow === f ? 'page' : undefined}>{f}</a> {/each}</p>
	{#each data.feedback as fb (fb.id)}
		{@const st = (fb.screenState ?? {}) as Record<string, string>}
		<div class="fb" class:done={fb.resolvedAt}>
			<p class="muted">{fmt(fb.createdAt)} · {fb.email ?? 'deleted user'} · {fb.route ?? ''}{st.appVersion ? ` · v${st.appVersion}` : ''}{st.viewport ? ` · ${st.viewport}` : ''}</p>
			<p class="text">{fb.message}</p>
			{#if st.lastStatus}<p class="muted">Last message on screen: “{st.lastStatus}”</p>{/if}
			{#if st.userAgent}<p class="muted small">{st.userAgent}</p>{/if}
			<form method="POST" action="?/resolveFeedback">
				<input type="hidden" name="id" value={fb.id} /><input type="hidden" name="resolved" value={fb.resolvedAt ? 'false' : 'true'} />
				<button class="small">{fb.resolvedAt ? 'Reopen' : 'Mark done'}</button>
			</form>
		</div>
	{:else}<p class="muted">Nothing here. Testers send feedback with the Feedback button or Shift+F1.</p>{/each}
</section>

<style>
	.filter a { margin-right: 1ch; }
	.filter a[aria-current='page'] { background: var(--fg); color: var(--bg); padding: 0 0.5ch; text-decoration: none; }
	.fb { border-top: 1px dotted var(--dim); padding: 0.5rem 0; }
	.fb.done { opacity: 0.6; }
	.fb p { margin: 0.15rem 0; }
	.fb .text { white-space: pre-wrap; }
	.small { font-size: 0.85em; }
</style>
