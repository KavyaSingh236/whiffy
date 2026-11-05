import {ALIASES,DESCRIPTORS,HOMES,PERFUMES} from './data.js';
export function extractNotes(text){
 const t=text.toLowerCase(); const notes=[],avoid=[];
 for(const label of DESCRIPTORS){
  const words=[...new Set([label,...(ALIASES[label]||[])])];
  for(const word of words){
   const re=new RegExp('\\b'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','g');
   let match,positive=false,negative=false;
   while((match=re.exec(t))!==null){
    const before=t.slice(Math.max(0,match.index-32),match.index);
    if(/(?:\bnot|\bno|\bwithout|\bavoid|\bless|\bhate|\bdislike|\bnever)(?:\s+\w+){0,3}\s*$/.test(before))negative=true; else positive=true;
   }
   if(negative&&!avoid.includes(label))avoid.push(label);
   if(positive&&!notes.includes(label))notes.push(label);
  }
 }
 return {notes:notes.filter(n=>!avoid.includes(n)),avoid,method:'local_rules',explanation:'Local keyword suggestions. Confirm or edit them before matching.'};
}
export function rankMolecules(molecules,notes,avoid=[],weights={}){
 if(!notes.length)return [];
 const total=notes.reduce((s,n)=>s+(weights[n]||1),0);
 return molecules.map(m=>{
  const wanted=notes.reduce((s,n)=>s+(m.predictions[n]||0)*(weights[n]||1),0)/total;
  const penalty=avoid.length?Math.max(...avoid.map(n=>m.predictions[n]||0)):0;
  const score=wanted-0.65*penalty;
  const matches=notes.map(n=>({label:n,value:m.predictions[n]||0})).sort((a,b)=>b.value-a.value);
  return {...m,score,wanted,penalty,matches};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function cosine(a,b){if(!a||!b||a.length!==b.length)return null;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/Math.sqrt(aa*bb):null}
export function planReferences(ranked,notes,avoid,owned){
 const top=ranked;
 return HOMES.map(h=>{
  const matched=notes.filter(n=>h.tags.includes(n)&&!avoid.includes(n));
  // References are selected only when at least one top model candidate supports that family.
  const support=top.map(m=>({id:m.id,name:m.name,value:Math.max(0,...matched.map(t=>m.predictions[t]||0))})).sort((a,b)=>b.value-a.value)[0];
  return {...h,matched,support,score:matched.length*(support?.value||0),available:owned.includes(h.id)};
 }).filter(h=>h.matched.length&&h.support?.value>=0.10&&!h.tags.some(t=>avoid.includes(t))).sort((a,b)=>b.score-a.score);
}
export function rankPerfumes(notes,avoid=[]){
 return PERFUMES.map(p=>({...p,matched:notes.filter(n=>p.tags.includes(n)),avoided:avoid.filter(n=>p.tags.includes(n))})).map(p=>({...p,score:p.matched.length-p.avoided.length*2})).filter(p=>p.score>0&&p.avoided.length===0).sort((a,b)=>b.score-a.score).slice(0,3);
}
export function makeGuide(notes,ranked,refs,perfumes){
 return {title:'A little way back',summary:`Your confirmed notes are ${notes.join(', ')}. Start with one familiar reference at a time, then notice which part feels closest to your memory.`,steps:['Choose one reference you already own. Keep each material in a separate dish or on its own strip.','Experience each reference separately. Remove anything that feels wrong, too strong, or uncomfortable.','Place only the familiar references near one another to explore the atmosphere. This is a sensory exercise, not a tested blend or wearable perfume.'],closing:'OpenPOM ranks individual molecules. Household materials and finished perfumes are mixtures, and their combined smell has not been predicted or validated.',method:'curated_local_guide'};
}

export function cleanReflection(text){
 if(typeof text!=='string')return null;
 const t=text.replace(/^["'\s]+|["'\s]+$/g,'').trim();
 if(/\b(?:you can|you should|following sentence|here is|here's|instructions|recipe|mix|heat|burn|apply|drops|tablespoon|teaspoon)\b/i.test(t))return null;
 const sentences=t.match(/[^.!?]+[.!?]+/g);
 if(!sentences)return null;
 const complete=sentences.slice(0,2).join('').trim();
 return complete.length>=25&&complete.length<=700?complete:null;
}
