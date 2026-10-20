<script lang="ts">let {data,form}=$props();</script>
<section class="window"><h1>Reusable templates</h1><p>Create or apply a template from any <a href="/edit/cvs">saved CV</a>. Applied styles are copied into the CV so later template deletion does not change it.</p>
 {#if form?.error}<p role="alert">{form.error}</p>{/if}
 {#each data.templates as t}<article><h2>{t.name}</h2><p>{Object.entries(t.style).map(([key,value])=>`${key}: ${value}`).join(' · ')||'Classical defaults'}</p>{#if t.referenceSourceId}<p><a data-sveltekit-reload href="/edit/templates/{t.id}/original">Download original style reference</a></p>{/if}<details><summary>Delete template</summary><form method="POST" action="?/delete"><input type="hidden" name="id" value={t.id}/><label>Type DELETE<input name="confirm" required pattern="DELETE"/></label><button class="danger">Delete template</button></form></details></article>{/each}
 {#if !data.templates.length}<p>No custom templates yet. Classical A4 is always available.</p>{/if}
</section>
