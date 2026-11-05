import test from 'node:test';
import assert from 'node:assert/strict';
import {apiOrigin,callLiveAPI} from '../dist/live-api.js';
import {cleanMemory} from '../dist/accounts.js';
const account=()=>({user:{id:'a'},generation:1,client:{auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}}});
test('API configuration never accepts a secret-bearing URL or remote HTTP',()=>{
 assert.equal(apiOrigin({apiUrl:'https://whiffy.example'}),'https://whiffy.example');
 for(const apiUrl of ['http://remote.example','https://secret@host.example','https://host.example/api?key=secret'])assert.throws(()=>apiOrigin({apiUrl}));
});
test('live pipeline requires sign-in and sends access token only in the Authorization header',async()=>{
 await assert.rejects(callLiveAPI('https://example',{},'/api/recreate',{}),/Sign in/);
 const result=await callLiveAPI('https://example',account(),'/api/recreate',{notes:['rose']},{fetcher:async(url,options)=>{
  assert.equal(url,'https://example/api/recreate');assert.equal(options.headers.Authorization,'Bearer test-token');assert.equal(options.body,'{"notes":["rose"]}');return {ok:true,json:async()=>({evidence:{mode:'live_openpom'}})};
 }});assert.equal(result.evidence.mode,'live_openpom');
});
test('live errors are shown instead of silently substituting cached results',async()=>{
 await assert.rejects(callLiveAPI('https://example',account(),'/api/recreate',{}, {fetcher:async()=>({ok:false,json:async()=>({detail:'OpenPOM unavailable'})})}),/OpenPOM unavailable/);
});
test('account change discards in-flight live results',async()=>{
 const a=account();await assert.rejects(callLiveAPI('https://example',a,'/api/recreate',{}, {fetcher:async()=>{a.user={id:'b'};return {ok:true,json:async()=>({})}}}),/account changed/);
});
test('saved live snapshots are compact and remove unsafe links',()=>{
 const live={evidence:{mode:'live_openpom',ensemble_size:1},ranked:Array.from({length:16},(_,i)=>({id:String(i),name:'Rose',predictions:{rose:.9},score:.9,embedding:Array(256).fill(0),matches:[]})),refs:[],perfumes:[{name:'Test',url:'javascript:alert(1)',image_url:'data:text/html,test',color:'red;bad'}]};
 const clean=cleanMemory({memory:'My rose garden memory',notes:['rose'],live});
 assert.equal(clean.live.ranked.length,5);assert.equal(clean.live.perfumes[0].url,'');assert.equal(clean.live.perfumes[0].image_url,'');assert.equal(clean.live.perfumes[0].color,'#969e93');
 assert.ok(JSON.stringify(clean).length<100000);
});
