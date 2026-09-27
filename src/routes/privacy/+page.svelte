<script lang="ts">
	let { data } = $props();
	const o = $derived(data.operator);
	const missing = '[not configured]';
</script>

<svelte:head><title>Privacy · Modular CV Composer</title></svelte:head>

<section class="window">
	<h1>Privacy notice</h1>
	{#if data.appEnv !== 'production'}<p class="msg ok">This is a test version, used by invitation only.</p>{/if}

	<h3>Who is responsible</h3>
	<p>{o.name ?? missing} runs this service and is the controller of your data under the GDPR.
		Contact for anything privacy-related: {o.contact ?? missing}.</p>

	<h3>What is stored</h3>
	<ul>
		<li><b>Your account:</b> name, e-mail address, role, a scrypt hash of your password (never the password itself), when you joined and last logged in.</li>
		<li><b>What you write:</b> your profile, CV content, wordings, tags, job categories, jobs (including job-ad text you paste in) and the snapshots you save.</li>
		<li><b>Share links:</b> for each link you create, how often it was opened and when last. Nothing about the visitor (no IP address, no browser details).</li>
		<li><b>Feedback</b> you send from inside the app.</li>
	</ul>

	<h3>Cookies and tracking</h3>
	<p>Two cookies, both strictly necessary: one keeps you logged in, one remembers which CV the editor preview shows.
		There is no analytics, no advertising and no third-party tracking of any kind.</p>

	<h3>Why, and on what basis</h3>
	<p>Only to provide the service you signed up for (GDPR Art. 6(1)(b), performance of a contract). Your content is not
		sold, shared or used to train anything. The administrator can see account details (name, e-mail, role, dates) but
		has no screen that shows your CV content.</p>

	<h3>Where</h3>
	<p>{o.hosting ?? missing}</p>

	<h3>How long</h3>
	<p>Until you delete it. Deleting your account removes everything listed above immediately; copies in backups
		disappear as backups expire, within {o.backupRetentionDays} days.</p>

	<h3>Your rights</h3>
	<p>You can download all your data as a file and delete your account yourself under <a href="/account">Account</a>.
		For anything else — correction, restriction, objection, questions — write to {o.contact ?? missing}.
		You can also complain to your data protection authority (in Hungary: NAIH, naih.hu).</p>
</section>

<style>
	h3 { color: var(--accent); font-size: 1em; margin: 1.25rem 0 0.25rem; }
	ul { padding-left: 3ch; }
</style>
