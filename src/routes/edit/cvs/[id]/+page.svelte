<script lang="ts">
 import CompositionEditor from '$lib/editor/CompositionEditor.svelte';
 import { MODULE_FIELDS, MODULE_LABELS } from '$lib/editor/fields';
 let { data, form } = $props();
 let previewWidth=$state(800);
 const previewScale=$derived(Math.min(1,Math.max(.25,(previewWidth-2)/794)));
 const display = (value: unknown) => value === null ? 'Present' : String(value);
</script>
<svelte:head><title>{data.cv.name} · Saved CV</title></svelte:head>
<section class="window saved-cv">
 <p><a href="/edit/cvs">← Saved CVs</a>{#if data.importId} · <a href="/edit/imports/{data.importId}">Source import and original file</a>{/if}</p>
 <h1>{data.cv.name}</h1>
 <p class="hint">This saved copy keeps its original content when the library changes. The preview uses this CV's saved template. Edit this copy below, then save to refresh its preview.</p>
 <div class="composer-workspace"><section class="layout-panel" aria-label="CV layout and export">
  <h2>{data.cv.designKey==='reference'?'Reference style':'Classical A4'} · two-page limit</h2>
  <p class="hint">Single column · readable text · saved spacing. One or two pages is valid.</p>
  {#if data.layout}
   <p class:over-limit={!data.layout.analysis.withinLimit} class="layout-status" role="status">
    {data.layout.analysis.pageCount} {data.layout.analysis.pageCount === 1 ? 'page' : 'pages'} / 2 maximum
    {data.layout.analysis.withinLimit ? '— ready to export' : '— shorten or correct the content before export'}
   </p>
   {#if data.layout.analysis.withinLimit}
    <p class="downloads"><a href="/cv/composition/{data.cv.id}?format=html" data-sveltekit-reload>Download HTML</a>
     {#if data.pdfEnabled} · <a href="/cv/composition/{data.cv.id}?format=pdf" data-sveltekit-reload>Download PDF</a>{:else}<span class="hint"> · PDF export is not switched on for this account.</span>{/if}
    </p>
   {:else}
    <p class="hint">Export is blocked. All content remains visible in the preview; text has not been reduced or removed.</p>
    {#if data.layout.analysis.overflow.length}
     <h3>Content beyond page two</h3>
     <ul class="overflow-list">{#each data.layout.analysis.overflow as item}<li><b>Page {item.page}: {item.label}</b><p>{item.excerpt}</p></li>{/each}</ul>
     <p class="hint">Shorten long summaries or bullets, remove less relevant items, or select a shorter wording below. Changes to the shared library do not change this saved copy.</p>
    {/if}
    {#if data.layout.analysis.horizontal.length}<p role="alert">Some content exceeds the page width. Review: {data.layout.analysis.horizontal.map(item => item.label).join(', ')}.</p>{/if}
   {/if}
   <div class="preview-viewport" bind:clientWidth={previewWidth}><iframe style:width={`${100/previewScale}%`} style:height={`${80/previewScale}vh`} style:transform={`scale(${previewScale})`} class="paper-preview" title="Classical A4 preview with page boundaries" sandbox="" src="/cv/composition/{data.cv.id}?format=preview&amp;revision={data.layout.revision}"></iframe></div>
  {:else}<p role="alert">The preview could not be generated. Your saved content is available below.</p>{/if}
 </section><section class="edit-panel">
 {#if form?.error}<p role="alert" class="msg error">{form.error}</p>{/if}
 {#if form?.saved}<p role="status" class="msg ok">{form.saved}</p>{/if}
 <h2>Edit this CV</h2>
 <CompositionEditor cv={data.cv} revision={data.revision} library={data.library} {form}/>
 <details><summary>Copy saved content to the shared library</summary>
  <p>Save your CV first. Each action creates a new library entry; it does not replace shared facts or wordings.</p>
  {#each data.cv.document.sections as section,s}{#each section.entries as entry,e}
   <form method="POST" action="?/publish"><input type="hidden" name="revision" value={data.revision}/><input type="hidden" name="section" value={s}/><input type="hidden" name="entry" value={e}/><button>Copy {section.title||MODULE_LABELS[section.module]} entry {e+1} to library</button></form>
  {/each}{/each}
 </details>
 <p><a href="/edit/cvs/{data.cv.id}/chat">Compare or tailor in chat</a> · <a href="/edit/cvs/{data.cv.id}/template">Choose a template</a></p>
 <form method="POST" action="?/duplicate"><button>Duplicate CV</button></form>
 <details><summary>Delete this saved CV</summary><form method="POST" action="?/delete"><label>Type DELETE<input name="confirm" required pattern="DELETE"/></label><button class="danger">Delete saved CV</button></form></details>
 </section></div>
 <details class="saved-content"><summary>Inspect saved content and library links</summary>
 {#if data.cv.document.profile}
  <h2>{data.cv.document.profile.fullName}</h2>
  <p>{data.cv.document.profile.email} {data.cv.document.profile.phone ?? ''} {data.cv.document.profile.location ?? ''}</p>
 {/if}
 {#each data.cv.document.sections as section}
  <section>
   <h2>{section.title || MODULE_LABELS[section.module]}</h2>
   {#each section.entries as entry}
    <article>
     <dl>{#each MODULE_FIELDS[section.module] as field}{#if entry.data[field.name] !== undefined && entry.data[field.name] !== ''}<dt>{field.label}</dt><dd>{display(entry.data[field.name])}</dd>{/if}{/each}</dl>
     {#if entry.text}<p class="wording">{entry.text}</p>{/if}
     {#if entry.items.length}<ul>{#each entry.items as item}<li>{item.text}</li>{/each}</ul>{/if}
     {#if entry.libraryEntryId && data.entryIds.includes(entry.libraryEntryId)}<p class="hint"><a href="/edit/content/entry/{entry.libraryEntryId}">View shared library entry</a></p>{/if}
    </article>
   {/each}
  </section>
 {/each}
 </details>
</section>
<style>
 .saved-cv { max-width:none; }
 .composer-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2rem;align-items:start;}
 .edit-panel{grid-column:1;grid-row:1;min-width:0;}
 .layout-panel{grid-column:2;grid-row:1;position:sticky;top:1rem;max-height:calc(100vh - 3rem);overflow:auto;}
 @media(max-width:1100px){.composer-workspace{display:flex;flex-direction:column}.layout-panel{position:static;max-height:none;width:100%;order:1}.edit-panel{order:0;width:100%;}}

 .layout-panel { margin: 1.5rem 0; }
 .layout-status { color: var(--accent); font-weight: bold; }
 .layout-status.over-limit { color: var(--fg); border: 1px solid currentColor; padding: .5rem; }
 .preview-viewport{width:100%;height:80vh;overflow:hidden;}
 .paper-preview { transform-origin:top left; width: 100%; height: 80vh; border: 1px solid var(--dim); background: #e7e7e7; }
 .overflow-list { max-height: 22rem; overflow: auto; border: 1px solid var(--dim); padding: 1rem 3ch; }
 .overflow-list li p { margin: .25rem 0 1rem; }
 .saved-content { margin-top: 1.5rem; }
 h3 { font-size: 1em; }
 .wording, li { white-space: pre-wrap; overflow-wrap: anywhere; }
 article { border-bottom: 1px solid var(--dim); padding: 0.5rem 0; }
 dl { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 2ch; }
 dd { margin: 0; overflow-wrap: anywhere; }
</style>
