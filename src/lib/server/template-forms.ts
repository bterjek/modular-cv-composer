import { STYLE_CHOICES, templateStyleSchema } from '$lib/domain/style';
export function templateFromForm(form:FormData){
 const json=String(form.get('styleJSON')??'').trim();
 if(json.length>10000)throw new Error('Style JSON is too large.');
 return templateStyleSchema.parse(json?JSON.parse(json):Object.fromEntries(Object.keys(STYLE_CHOICES).filter(key=>key!=='dates').flatMap(key=>form.get(key)?[[key,String(form.get(key))]]:[])));
}
