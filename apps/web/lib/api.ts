export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001";
export async function api(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers);
  // Existing callers serialize JSON themselves. Native bodies keep their own media type.
  if(typeof init.body==="string"&&init.body.length>0&&!headers.has("content-type"))headers.set("content-type","application/json");
  const r=await fetch(API_URL+path,{...init,credentials:"include",headers});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(body.error??"REQUEST_FAILED"),{status:r.status,body});
  return body;
}
