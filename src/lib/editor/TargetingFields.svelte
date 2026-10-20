<script lang="ts">
 import type {Targeting} from '$lib/domain/library';
 let {value}: {value?:Targeting}=$props();
</script>
<details><summary>Target roles and ATS emphasis</summary>
 <label>Target roles<input name="roleFamilies" value={value?.roleFamilies.join(', ')??''}/></label>
 <label>Competencies<input name="competencies" value={value?.competencies.join(', ')??''}/></label>
 <label>Keywords<input name="keywords" value={value?.keywords.join(', ')??''}/></label>
 <label>Basis<select name="basis" value={value?.basis??'unspecified'}><option value="unspecified">Unspecified</option><option value="inferred">Inferred</option><option value="confirmed">Confirmed by me</option></select></label>
 <label>Notes<textarea name="targetingNotes" rows="2">{value?.notes??''}</textarea></label>
</details>
