<script lang="ts">
 let { data, form } = $props();
 let reading = $state(false);
</script>
<svelte:head><title>Import CV · Library</title></svelte:head>
<section class="window">
 <h1>Import an existing CV</h1>
 <p>Upload a PDF or Word document. Review the extracted sections and wording before adding anything to your library.</p>
 <p class="hint">PDF or DOCX · up to 4 MB and 30 PDF pages. Extraction runs locally. Scans need text pasted during review.</p>
 {#if form?.error}<p class="msg err" role="alert">{form.error}</p>{/if}
 <form method="POST" action="?/upload" enctype="multipart/form-data" onsubmit={() => reading = true}>
  <label for="cv">Existing CV</label>
  <input id="cv" name="cv" type="file" accept=".pdf,.docx" required />
  <button disabled={reading}>{reading ? 'Reading document…' : 'Upload and review'}</button>
 </form>
 <h2>Your imports</h2>
 {#if !data.imports.length}<p class="hint">No CVs imported yet.</p>{/if}
 <ul>{#each data.imports as item}<li><a href="/edit/imports/{item.id}">{item.draft.name}</a> — {item.acceptedAt ? 'Added to library' : 'Awaiting review'}</li>{/each}</ul>
</section>
