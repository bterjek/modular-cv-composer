// Fixed template for saved compositions. All copied content is rendered in source order.
import { ACCENTS, templateStyleSchema, type TemplateStyle } from '$lib/domain/style';
import type { CompositionDocument } from '$lib/domain/library';
import { MODULE_LABELS } from '$lib/editor/fields';
import { h, raw, safeHref, type SafeHtml } from './html';
import { CREDENTIAL_KIND_LABEL, LANGUAGE_LEVEL_LABEL, range, month, str } from './format';

export const CLASSICAL_VERSION = 'classical-a4@2';
export const CLASSICAL_PAGE_LIMIT = 2;
const CSS = `
*{box-sizing:border-box}html{background:#e7e7e7}body{margin:0;color:#1b1b1b;font-family:'Source Serif 4',Georgia,serif;font-size:11pt;line-height:1.3;font-variant-numeric:lining-nums}
#cv-source{width:172mm;margin:auto}#cv-pages{margin:0;padding:0}
.cv-sheet{width:210mm;height:297mm;padding:18mm 19mm;margin:18px auto;position:relative;background:#fff;box-shadow:0 2px 12px #0002;break-after:page;break-inside:avoid}
.cv-sheet:last-child{break-after:auto}.cv-content{display:flow-root;width:172mm;height:261mm;overflow:visible}
.cv-unit{display:flow-root;margin-top:1.3mm;overflow-wrap:anywhere;min-width:0}.cv-content>.cv-unit:first-child{margin-top:0}
h1,h2,h3,p,ul{margin:0}h1{font-size:22pt;font-weight:600;line-height:1.15}h2{font-size:12pt;font-weight:600;line-height:1.2;border-bottom:.5pt solid #444;padding-bottom:.8mm}h3{font-size:11pt;font-weight:600;line-height:1.25}
.kind-section{margin-top:4.2mm}.kind-entry{margin-top:2.8mm}.kind-facts{margin-top:.4mm;color:#333}.kind-contact{margin-top:1mm;font-size:9.5pt}.kind-headline{font-size:12pt;font-style:italic}
.kind-bullet{margin-top:.7mm}ul{padding-left:4.5mm}li{padding-left:.5mm}p,li,h1,h2,h3{white-space:pre-wrap;overflow-wrap:anywhere}
a{color:inherit;text-decoration:none}.sheet-number{position:absolute;bottom:7mm;left:19mm;right:19mm;text-align:center;font-size:9pt;color:#666}
.cv-sheet[data-over-limit='true']{outline:2px solid #a22}.cv-unit[data-horizontal-overflow='true']{outline:1px solid #a22}
@page{size:A4;margin:0}@media print{html,body{background:white}.cv-sheet{margin:0;box-shadow:none;outline:none!important}.cv-unit{outline:none!important}}
`;

const period = (start: unknown, end: unknown) => !start && end === null ? 'Present' : range(start, end);

type Entry = CompositionDocument['sections'][number]['entries'][number];
function entryFacts(module: CompositionDocument['sections'][number]['module'], entry: Entry) {
 const data=entry.data;
 let title='', details: string[]=[];
 const consumed=new Set<string>();
 const take=(key:string)=>{consumed.add(key);return str(data,key);};
 if(module==='experience') {title=take('title');details=[take('organization'),take('location'),period(data.start,data.end)];consumed.add('start');consumed.add('end');}
 else if(module==='education') {title=[take('degree'),take('field')].filter(Boolean).join(', ');details=[take('institution'),period(data.start,data.end)];consumed.add('start');consumed.add('end');}
 else if(module==='credentials') {title=take('name');details=[take('issuer'),CREDENTIAL_KIND_LABEL[take('kind')]??'',month(data.issued),data.expires?`Valid until ${month(data.expires)}`:''];consumed.add('issued');consumed.add('expires');}
 else if(module==='languages') {title=take('language');details=[LANGUAGE_LEVEL_LABEL[take('level')]??str(data,'level')];}
 else if(module==='skills') title=take('group');
 else if(module==='projects') {title=take('name');details=[period(data.start,data.end)];consumed.add('start');consumed.add('end');}
 else if(module==='custom') title=take('heading');
 // Include any remaining stored facts, including URLs, rather than silently dropping them.
 const extra=Object.entries(data).filter(([key,value])=>!consumed.has(key)&&value!==undefined&&value!==''&&value!==null).map(([key,value])=>`${({credentialUrl:'Verification',url:'Link'} as Record<string,string>)[key]??key.replace(/([a-z])([A-Z])/g,'$1 $2')}: ${typeof value==='object'?JSON.stringify(value):String(value)}`);
 return {title,details:[...details.filter(Boolean),...extra].join(' · ')};
}

export function renderClassicalSource(document: CompositionDocument, fontCss: string, input: TemplateStyle = {}) {
 const style=templateStyleSchema.parse(input);
 const [vertical,horizontal]=style.margins==='narrow'?[16,16]:style.margins==='wide'?[22,23]:[18,19];
 const width=210-horizontal*2,height=297-vertical*2;
 const additions=`#cv-source,.cv-content{width:${width}mm}.cv-content{height:${height}mm}.cv-sheet{padding:${vertical}mm ${horizontal}mm}.sheet-number{left:${horizontal}mm;right:${horizontal}mm}body{font-family:${style.font==='inter'?"'Inter',Arial,sans-serif":"'Source Serif 4',Georgia,serif"};font-size:${style.size==='small'?10.5:style.size==='large'?12:11}pt;line-height:${style.density==='compact'?1.2:style.density==='airy'?1.45:1.3}}h2{color:${style.accent?ACCENTS[style.accent as keyof typeof ACCENTS]:'#1b1b1b'};${style.rules==='off'?'border:0;':''}}.kind-wording,.kind-bullet{text-align:${style.align??'left'}}ul{list-style-type:${style.bullets==='square'?'square':style.bullets==='dash'?"'– '":'disc'}}`;
 const units: SafeHtml[]=[];
 let serial=0;
 const unit=(kind:string,label:string,body:SafeHtml,keep=false,splittable=true)=>{
  units.push(h`<div class="cv-unit kind-${kind}" data-unit-id="u${serial++}" data-kind="${kind}" data-label="${label.slice(0,200)}" data-keep-next="${keep?'true':'false'}" data-splittable="${splittable?'true':'false'}">${body}</div>`);
 };
 const p=document.profile;
 if(p){
  unit('name','Name',h`<h1 data-text>${p.fullName}</h1>`,true);
  const parts=[p.email,p.phone,p.location].filter(Boolean).join(' · ');
  if(parts)unit('contact','Contact',h`<p data-text>${parts}</p>`);
  for(const link of p.links){const href=safeHref(link.url);unit('contact','Profile link',href?h`<p><a href="${href}" data-text>${link.label}: ${link.url}</a></p>`:h`<p data-text>${link.label}: ${link.url}</p>`);}
 }
 for(const section of document.sections){
  const sectionLabel=section.title||MODULE_LABELS[section.module];
  if(section.module!=='headline')unit('section',sectionLabel,h`<h2 data-text>${sectionLabel}</h2>`,section.entries.length>0);
  for(const [index,entry] of section.entries.entries()){
   const facts=entryFacts(section.module,entry);
   const label=`${sectionLabel} / ${facts.title||`entry ${index+1}`}`;
   const hasContent=Boolean(entry.text)||entry.items.length>0;
   if(facts.title)unit('entry',label,h`<h3 data-text>${facts.title}</h3>`,Boolean(facts.details)||hasContent);
   if(facts.details)unit('facts',label,h`<p data-text>${facts.details}</p>`,hasContent);
   if(entry.text)unit(section.module==='headline'?'headline':'wording',label,h`<p data-text>${entry.text}</p>`);
   for(const [itemIndex,item] of entry.items.entries())unit('bullet',`${label} / bullet ${itemIndex+1}`,h`<ul><li data-text>${item.text}</li></ul>`);
  }
 }
 const title=p?.fullName?`${p.fullName} — CV`:'CV';
 return '<!doctype html>\n'+h`<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';font-src data:;img-src data:;script-src 'none';base-uri 'none';form-action 'none'"/><meta name="generator" content="Modular CV Composer ${CLASSICAL_VERSION}"/><title>${title}</title><style>${raw(fontCss)}${raw(CSS)}${raw(additions)}</style></head><body><div id="cv-source">${units}</div></body></html>`.value;
}
