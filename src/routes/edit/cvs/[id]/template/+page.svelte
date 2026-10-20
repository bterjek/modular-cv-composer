<script lang="ts">
 import {STYLE_CHOICES,STYLE_LABELS} from '$lib/domain/style';
 let {data,form}=$props();
 const keys=Object.keys(STYLE_CHOICES).filter(key=>key!=='dates') as Exclude<keyof typeof STYLE_CHOICES,'dates'>[];
 const example=JSON.stringify({font:'source-serif',size:'normal',density:'normal',align:'left',accent:'navy',rules:'on',bullets:'dot',margins:'normal'},null,2);
</script>
<section class="window">
 <h1>CV templates</h1><p><a href="/edit/cvs/{data.cv.id}">← {data.cv.name}</a></p>
 <p>A template changes presentation while keeping your CV content intact. All templates use readable, single-column A4 pages and the two-page export limit.</p>
 {#if form?.error}<p role="alert">{form.error}</p>{/if}
 <form method="POST" action="?/apply"><label for="template">Saved template</label><select id="template" name="template"><option value="">Classical A4 · fixed baseline</option>{#each data.templates as t}<option value={t.id}>{t.name}</option>{/each}</select><button>Apply template</button></form>
 <h2>Create a reusable template from a reference</h2>
 <p>Attach the PDF or DOCX you like, then choose the closest supported settings below. The file is retained as a visual reference; its layout is not automatically cloned. Complex columns, graphics and custom fonts need a separate template implementation.</p>
 <details><summary>Use chat to describe the reference style</summary><p>Attach your reference CV in your preferred chat and ask: “Describe this CV's style using only the choices shown here. Return one JSON object in this shape, without CSS or content.” Paste that JSON below, preview it and check the result.</p><pre>{example}</pre><ul>{#each keys as key}<li>{STYLE_LABELS[key]}: {STYLE_CHOICES[key].join(', ')}</li>{/each}</ul></details>
 <form method="POST" action="?/preview" enctype="multipart/form-data">
  <label for="template-name">Template name</label><input id="template-name" name="name" maxlength="200" placeholder="My reference style"/>
  <label for="reference">Reference CV (optional, PDF/DOCX up to 4 MB)</label><input id="reference" name="reference" type="file" accept=".pdf,.docx"/>
  {#each keys as key}<label for="style-{key}">{STYLE_LABELS[key]}</label><select id="style-{key}" name={key}><option value="">Classical default</option>{#each STYLE_CHOICES[key] as value}<option value={value} selected={value===(form?.style??data.cv.style)[key]}>{value}</option>{/each}</select>{/each}
  <label for="style-json">Style JSON from chat (optional; overrides the choices above)</label><textarea id="style-json" name="styleJSON" rows="5" maxlength="10000"></textarea>
  <button>Preview style</button><button class="primary" formaction="?/save">Save template and apply</button>
 </form>
 {#if form?.style}<h2>Unsaved style preview</h2><p>Check the page count and layout before saving. Downloads use the saved template.</p><iframe title="Reference style preview" sandbox="" style="width:100%;height:1100px" src="/cv/composition/{data.cv.id}?format=preview&amp;stylePreview={encodeURIComponent(JSON.stringify(form.style))}"></iframe>{/if}
</section>
