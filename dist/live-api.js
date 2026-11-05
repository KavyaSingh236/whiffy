// The only public API setting is its HTTPS origin; LLM secrets stay on the server.
export function apiOrigin(config, pageOrigin=globalThis.location?.origin){
 const value=String(config?.apiUrl||'').trim();
 if(!value)return pageOrigin;
 const u=new URL(value);
 if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('Use an HTTPS backend URL.');
 if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Use the backend origin without a path.');
 return u.origin;
}
export async function callLiveAPI(origin,accounts,path,body,{fetcher=fetch,timeout=180000}={}){
 if(!accounts.user||!accounts.client)throw Error('Sign in with Google to use the memory assistant.');
 const accountId=accounts.user.id,generation=accounts.generation;
 const {data,error}=await accounts.client.auth.getSession();
 if(error||!data.session?.access_token)throw Error('Your session expired. Please sign in again.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetcher(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:controller.signal});
  if(accounts.user?.id!==accountId||accounts.generation!==generation)throw Error('Your account changed. Please try again.');
  const result=await response.json();
  if(!response.ok)throw Error(typeof result.detail==='string'?result.detail:'The memory assistant could not complete this request.');
  return result;
 }catch(error){if(error.name==='AbortError')throw Error('The scent studio took too long. It may be starting up; please retry.');throw error;}
 finally{clearTimeout(timer);}
}
