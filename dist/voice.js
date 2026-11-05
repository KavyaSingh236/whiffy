export function combineTranscript(base,segments,maxLength=4000){return [base.trimEnd(),...segments.map(s=>s.trim()).filter(Boolean)].filter(Boolean).join(' ').slice(0,maxLength)}
export function mountVoice({button,textarea,status,onText,Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,language=globalThis.navigator?.language||'en-US'}){
 let recognition=null,disposed=false,active=false,base='',failure=false;
 const idle=()=>{active=false;if(disposed)return;textarea.readOnly=false;button.disabled=false;button.setAttribute('aria-pressed','false');button.classList.remove('listening');button.innerHTML='<span aria-hidden="true">🎙</span> Speak your memory';};
 if(!Recognition){button.disabled=true;button.textContent='Voice unavailable';button.title='This browser does not support speech recognition';status.textContent='Voice isn’t supported in this browser. You can still type your memory.';return()=>{disposed=true}}
 button.setAttribute('aria-pressed','false');
 button.onclick=()=>{
  if(active){try{recognition.stop()}catch{idle()}return}
  base=textarea.value;failure=false;recognition=new Recognition();recognition.lang=language;recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  active=true;button.disabled=true;button.textContent='Starting microphone…';status.textContent='Allow microphone access to dictate. Uses your browser’s speech service.';
  recognition.onstart=()=>{if(disposed){recognition.abort();return}textarea.readOnly=true;button.disabled=false;button.classList.add('listening');button.setAttribute('aria-pressed','true');button.innerHTML='<span class="record-dot" aria-hidden="true"></span> Stop listening';status.textContent='Listening… Speak naturally. You can edit your words when you stop.'};
  recognition.onresult=event=>{
   if(disposed)return;const final=[],interim=[];
   for(let i=0;i<event.results.length;i++){const result=event.results[i];(result.isFinal?final:interim).push(result[0].transcript)}
   textarea.value=combineTranscript(base,final);onText(textarea.value);
   status.textContent=interim.length?`Hearing: ${interim.join(' ')}`:'Listening… Your words have been added.';
   if(textarea.value.length>=4000){status.textContent='Your memory reached the 4,000-character limit.';recognition.stop()}
  };
  recognition.onerror=event=>{failure=true;if(disposed)return;const messages={'not-allowed':'Microphone permission was denied. Allow it in your browser or type your memory.','service-not-allowed':'Speech recognition is unavailable in this browser. Please type your memory.','audio-capture':'No microphone was found. Check your device or type your memory.','no-speech':'No speech was detected. Tap the microphone to try again.',network:'The speech service could not connect. Check your connection or type your memory.',aborted:'Voice input stopped.'};status.textContent=messages[event.error]||'Voice input couldn’t start. You can still type your memory.';idle()};
  recognition.onend=()=>{idle();if(!disposed&&!failure)status.textContent='Voice input stopped. Review or edit your words before submitting.'};
  try{recognition.start()}catch{failure=true;idle();status.textContent='Voice input could not start. Please try again or type your memory.'}
 };
 return()=>{disposed=true;button.onclick=null;textarea.readOnly=false;try{recognition?.abort()}catch{}};
}
