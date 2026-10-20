<script lang="ts">
 import { MODULE_LABELS } from '$lib/editor/fields';
 let {data,form}=$props();
</script>
<section class="window">
 <h1>Work with your chat client</h1>
 <p><a href="/edit/cvs/{data.cv.id}">← {data.cv.name}</a></p>
 <ol><li>Download the CV and library context below.</li><li>Attach it to your preferred chat, paste a job description, and ask for comparison or a tailored version.</li><li>Review the evidence and wording in chat. Paste the returned CV JSON here to review it before saving a new CV.</li></ol>
 <p>The download contains your CV, contact details and library wordings. You choose where to share it; the app sends nothing to an AI service.</p>
 <p><a data-sveltekit-reload href="/edit/cvs/{data.cv.id}/exchange?format=text">Download chat instructions and context</a> · <a data-sveltekit-reload href="/edit/cvs/{data.cv.id}/exchange">Download JSON context</a></p>
 {#if form?.error}<p role="alert">{form.error}</p>{/if}
 <form method="POST" action="?/review"><label for="response">Returned CV JSON</label><textarea id="response" name="response" rows="12" required maxlength="500000">{form?.response??''}</textarea><button class="primary">Review returned CV</button></form>
 {#if form?.candidate}
  <h2>Review: {form.candidate.name}</h2>
  <p>Check every factual claim. Acceptance creates a new independent CV; the current CV and library stay intact.</p>
  {#if form.candidate.document.profile}<p>{form.candidate.document.profile.fullName} · {form.candidate.document.profile.email} · {form.candidate.document.profile.phone??''} · {form.candidate.document.profile.location??''}</p>{#each form.candidate.document.profile.links as link}<p>{link.label}: {link.url}</p>{/each}{/if}
  {#each form.candidate.document.sections as section}<h3>{section.title||MODULE_LABELS[section.module]}</h3>{#each section.entries as entry}<dl>{#each Object.entries(entry.data) as [key,value]}<dt>{key}</dt><dd>{value===null?'Present':String(value)}</dd>{/each}</dl><p>{entry.text??''}</p><ul>{#each entry.items as item}<li>{item.text}</li>{/each}</ul>{/each}{/each}
  <form method="POST" action="?/accept"><input type="hidden" name="response" value={form.response}/><button class="primary">Accept as a new CV</button></form>
 {/if}
</section>
