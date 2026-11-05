let generator;
async function handle(data){
 try{
  if(data.type==='load'){
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2');
   env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
   generator=await pipeline('text-generation','onnx-community/SmolLM2-135M-Instruct-ONNX',{dtype:'q4',device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({id:data.id,type:'progress',file:p.file,progress:p.progress})}});
   self.postMessage({id:data.id,type:'ready'});return;
  }
  if(!generator)throw Error('Browser model is not loaded.');
  const result=await generator(data.messages,{max_new_tokens:data.maxTokens||100,do_sample:false,return_full_text:false});
  const value=result[0].generated_text;
  self.postMessage({id:data.id,type:'result',text:typeof value==='string'?value:value[value.length-1].content});
 }catch(e){self.postMessage({id:data.id,type:'error',message:String(e.message||e)})}
}
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.then(()=>handle(data));};
