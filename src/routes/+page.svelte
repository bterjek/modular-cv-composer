<script lang="ts">let {data}=$props();</script>
<svelte:head><title>Home · CV Composer</title></svelte:head>
<section class="window"><h1>Welcome, {data.user?.name}</h1>
 <p>Build a library from your existing CVs, then edit independent copies without disturbing their layout.</p>
 <p>Getting started:</p><ol><li><a href="/edit/imports">Import CVs</a> — review extracted facts and match existing experience.</li><li><a href="/edit/cvs">My CVs</a> — create, edit, reorder and export a CV within two pages.</li><li>Open a saved CV to compare it with a job description in your chat client or apply a reusable reference style.</li></ol>
 <p><a href="/edit/content">Shared library</a> · <a href="/edit/templates">Templates</a> · <a href="/assemble">Earlier assembly tools and example content</a></p>
 <p class="hint">F1 shows editor shortcuts. Shift+F1 sends feedback. Switch between simple and DOS appearance in the menu; appearance never changes your exported CV.</p>
</section>
