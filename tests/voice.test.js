import test from 'node:test';
import assert from 'node:assert/strict';
import {mountVoice,combineTranscript} from '../dist/voice.js';
function ui(){return {button:{disabled:false,textContent:'',innerHTML:'',title:'',setAttribute(){},classList:{add(){},remove(){}}},textarea:{value:'I remember',readOnly:false},status:{textContent:''}}}
let instance;
class Recognition{constructor(){instance=this}start(){this.onstart()}stop(){this.onend()}abort(){this.onend?.()}}
function result(text,isFinal){return Object.assign([{transcript:text}],{isFinal})}
test('voice preserves typed text and clips to the memory limit',()=>{assert.equal(combineTranscript('Coffee ',['and jasmine']),'Coffee and jasmine');assert.equal(combineTranscript('x'.repeat(3998),['words']).length,4000)});
test('unsupported browsers retain a working text area',()=>{const view=ui();mountVoice({...view,Recognition:null,onText(){}});assert.equal(view.button.disabled,true);assert.equal(view.textarea.readOnly,false);assert.match(view.status.textContent,/still type/)});
test('interim speech is displayed separately and final results are not duplicated',()=>{const view=ui();let text;mountVoice({...view,Recognition,onText:v=>text=v});view.button.onclick();assert.equal(view.textarea.readOnly,true);instance.onresult({results:[result('coffee',true),result('and jas',false)]});assert.equal(text,'I remember coffee');assert.match(view.status.textContent,/and jas/);instance.onresult({results:[result('coffee',true),result('and jasmine',true)]});assert.equal(text,'I remember coffee and jasmine');view.button.onclick();assert.equal(view.textarea.readOnly,false)});
test('denied microphone permission returns to editable text',()=>{const view=ui();mountVoice({...view,Recognition,onText(){}});view.button.onclick();instance.onerror({error:'not-allowed'});assert.equal(view.textarea.readOnly,false);assert.equal(view.button.disabled,false);assert.match(view.status.textContent,/permission was denied/)});
test('navigating away stops the microphone and ignores late results',()=>{const view=ui();let count=0;const dispose=mountVoice({...view,Recognition,onText:()=>count++});view.button.onclick();dispose();instance.onresult({results:[result('private late speech',true)]});assert.equal(count,0);assert.equal(view.textarea.readOnly,false);assert.equal(view.button.onclick,null)});
