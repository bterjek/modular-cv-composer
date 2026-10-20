<script lang="ts">let { data, form } = $props();</script>
<svelte:head><title>Saved CVs · Library</title></svelte:head>
<section class="window">
 <h1>Saved CVs</h1>
 <p>Each approved import keeps its own selection, order, facts and wording. Open a CV to preview and export it using the Classical A4 template.</p>
 <p><a href="/edit/imports">Import another CV</a></p>
 {#if form?.error}<p role="alert">{form.error}</p>{/if}
 <form method="POST" action="?/create"><label for="name">New CV name</label><input id="name" name="name" required maxlength="200"/><button class="primary">Create CV</button></form>
 {#if !data.cvs.length}<p class="hint">Approve a CV import to save its composition here.</p>{/if}
 <ul>{#each data.cvs as cv}<li><a href="/edit/cvs/{cv.id}">{cv.name}</a> — {cv.sections} sections</li>{/each}</ul>
</section>
