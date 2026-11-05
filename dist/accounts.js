import {LABELS} from './labels.js';
// A public Supabase key is safe in a browser only with the supplied RLS policies.
export function checkPublicConfig(config){
 const url=String(config?.supabaseUrl||'').trim();
 const key=String(config?.supabasePublishableKey||'').trim();
 if(!url&&!key)return null;
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Use the HTTPS Supabase project origin.');
 if(key.startsWith('sb_secret_'))throw Error('A secret key must never be used in the browser.');
 if(!key.startsWith('sb_publishable_')){
  try{const segment=key.split('.')[1];const payload=JSON.parse(atob(segment.replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error();}
  catch{throw Error('Use a publishable key or the legacy anon key, never service_role.');}
 }
 return {url:parsed.origin,key};
}
export function accountName(user){
 const name=user?.user_metadata?.full_name||user?.user_metadata?.name||user?.user_metadata?.display_name;
 return typeof name==='string'&&name.trim()?name.trim().split(/\s+/)[0].slice(0,30):'friend';
}
export function newMemoryId(cryptoSource=globalThis.crypto){
 if(cryptoSource?.randomUUID)return cryptoSource.randomUUID();
 if(!cryptoSource?.getRandomValues)throw Error('A secure browser context is required to save memories.');
 const bytes=cryptoSource.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
// Store only a compact, bounded snapshot. Text is escaped by the UI; all outbound links require HTTPS.
export function cleanLive(raw){
 if(!raw||raw.evidence?.mode!=='live_openpom'||!Array.isArray(raw.ranked)||!raw.ranked.length)return null;
 const str=(v,max=700)=>typeof v==='string'?v.slice(0,max):'';
 const list=(v,max=16)=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,max).map(x=>str(x)):[];
 const url=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const values=v=>Object.fromEntries(Object.entries(v||{}).slice(0,138).filter(([k,n])=>LABELS.includes(k)&&Number.isFinite(n)&&n>=0&&n<=1));
 const ranked=raw.ranked.slice(0,5).filter(m=>m&&typeof m.id==='string'&&m.predictions&&Number.isFinite(m.score)).map(m=>({id:str(m.id,80),name:str(m.name,100),smiles:str(m.smiles,300),source:url(m.source),context:str(m.context),reference_notes:list(m.reference_notes),score:m.score,wanted:m.wanted,penalty:m.penalty,predictions:values(m.predictions),ensemble_std:values(m.ensemble_std),embedding:Array.isArray(m.embedding)?m.embedding.slice(0,256).map(n=>Number.isFinite(n)?n:0):[],matches:(m.matches||[]).slice(0,16).filter(x=>LABELS.includes(x.label)&&Number.isFinite(x.value)).map(x=>({label:str(x.label,40),value:x.value}))}));
 if(!ranked.length)return null;
 const refs=(Array.isArray(raw.refs)?raw.refs:[]).slice(0,4).filter(r=>r&&r.support&&Number.isFinite(r.support.value)).map(r=>({id:str(r.id,80),name:str(r.name,100),item:str(r.item,200),tags:list(r.tags).filter(n=>LABELS.includes(n)),steps:list(r.steps,6),note:str(r.note),available:r.available===true,support:{id:str(r.support.id,80),name:str(r.support.name,100),value:r.support.value}}));
 const perfumes=(Array.isArray(raw.perfumes)?raw.perfumes:[]).slice(0,3).map(p=>({id:str(p.id,80),name:str(p.name,100),brand:str(p.brand,100),notes:list(p.notes),tags:list(p.tags),matched:list(p.matched),avoided:list(p.avoided),difference:str(p.difference),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#969e93',url:url(p.url),google_url:url(p.google_url),amazon_url:url(p.amazon_url),image_url:url(p.image_url)}));
 return {ranked,refs,perfumes,evidence:{mode:'live_openpom',ensemble_size:Number.isInteger(raw.evidence.ensemble_size)?raw.evidence.ensemble_size:1,embedding_model:'experiments_1'},generated_at:str(raw.generated_at,80)};
}
export function cleanMemory(raw){
 if(!raw||typeof raw!=='object'||typeof raw.memory!=='string'||raw.memory.length<10||raw.memory.length>4000||!Array.isArray(raw.notes))return null;
 const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,32):[];
 const guide=raw.guide&&typeof raw.guide.summary==='string'&&typeof raw.guide.title==='string'&&Array.isArray(raw.guide.steps)?{title:raw.guide.title.slice(0,100),summary:raw.guide.summary.slice(0,1500),steps:strings(raw.guide.steps).map(x=>x.slice(0,700)),closing:String(raw.guide.closing||'').slice(0,1000),method:typeof raw.guide.method==='string'?raw.guide.method.slice(0,80):'curated_local_guide'}:null;
 return {id:String(raw.id||''),date:Number.isFinite(Date.parse(raw.date))?raw.date:new Date().toISOString(),memory:raw.memory,title:typeof raw.title==='string'?raw.title.slice(0,70):'A little memory',notes:strings(raw.notes).filter(n=>LABELS.includes(n)),avoid:strings(raw.avoid).filter(n=>LABELS.includes(n)),owned:strings(raw.owned),weights:Object.fromEntries(Object.entries(raw.weights&&typeof raw.weights==='object'?raw.weights:{}).filter(([n,v])=>strings(raw.notes).includes(n)&&[1,2,3].includes(v))),method:typeof raw.method==='string'?raw.method.slice(0,80):'local_rules',guide,live:cleanLive(raw.live)};
}
export class AccountStore{
 constructor(){this.client=null;this.user=null;this.status='loading';this.generation=0;this.listeners=new Set();this.subscription=null;}
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener)}
 _emit(){for(const listener of this.listeners)listener({user:this.user,status:this.status,generation:this.generation})}
 _setUser(user){if(this.user?.id!==user?.id)this.generation++;this.user=user||null;this._emit()}
 async init(config,createClient){
  let verified;
  try{verified=checkPublicConfig(config)}catch{this.status='error';this._emit();return}
  if(!verified){this.status='unconfigured';this._emit();return}
  try{
   if(!createClient){({createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4'));}
   this.client=createClient(verified.url,verified.key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true,storageKey:'whiffy-auth-'+new URL(verified.url).hostname.split('.')[0]}});
   const {data}=this.client.auth.onAuthStateChange((_event,session)=>{this._setUser(session?.user||null)});this.subscription=data.subscription;
   const {data:sessionData,error:sessionError}=await this.client.auth.getSession();if(sessionError)throw sessionError;
   if(sessionData.session){const {data:userData,error}=await this.client.auth.getUser();if(error)throw error;this._setUser(userData.user)}else this._setUser(null);
   this.status='ready';this._emit();
  }catch{this.user=null;this.generation++;this.status='error';this._emit();}
 }
 async signIn(redirectTo){
  if(this.status!=='ready'||!this.client)throw Error('Account sign-in is not available yet. You can still explore a memory.');
  const {error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}});
  if(error)throw Error('Google sign-in could not start. Please try again.');
 }
 async signOut(){
  if(!this.client)return;
  const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw Error('Sign-out could not complete. Please try again.');
  this._setUser(null);
 }
 _owner(){if(!this.user?.id||!this.client||this.status!=='ready')throw Error('Sign in to save and view your personal memory shelf.');return {id:this.user.id,generation:this.generation}}
 _same(owner){if(owner.id!==this.user?.id||owner.generation!==this.generation)throw Error('Your account changed. Please try again.')}
 async list(){
  const owner=this._owner();const {data,error}=await this.client.from('whiffy_memories').select('id,payload,updated_at').eq('user_id',owner.id).order('updated_at',{ascending:false});this._same(owner);
  if(error)throw Error('Your memory shelf could not load. Please try again.');
  return (data||[]).map(row=>{const value=cleanMemory(row.payload);return value?{...value,id:row.id}:null}).filter(Boolean);
 }
 async save(entry){
  const owner=this._owner();const value=cleanMemory(entry);if(!value||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id))throw Error('This memory could not be saved. Please create a new scent echo.');
  const {data,error}=await this.client.from('whiffy_memories').upsert({user_id:owner.id,id:value.id,payload:value},{onConflict:'user_id,id'}).select('id,payload').single();this._same(owner);
  if(error||!data)throw Error('This memory could not be saved. Please try again.');return {...value,id:data.id};
 }
 async remove(id){
  const owner=this._owner();const {error}=await this.client.from('whiffy_memories').delete().eq('user_id',owner.id).eq('id',id);this._same(owner);
  if(error)throw Error('This memory could not be removed. Please try again.');
 }
}
