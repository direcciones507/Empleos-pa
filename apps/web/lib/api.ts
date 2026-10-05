export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:3001";
export async function api(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers);
  // Existing callers serialize JSON themselves. Native bodies keep their own media type.
  if(typeof init.body==="string"&&init.body.length>0&&!headers.has("content-type"))headers.set("content-type","application/json");
  const r=await fetch(API_URL+path,{...init,credentials:"include",headers});
  const body=await r.json().catch(()=>({}));
  // Re-enviar un perfil laboral ya activo es una operación idempotente para la UI.
  // El backend conserva su 409 para otros clientes, pero aquí recuperamos el perfil
  // autenticado y continuamos como éxito en vez de mostrar un falso error al usuario.
  if(!r.ok&&path==="/v1/candidate/profile/submit"&&r.status===409&&body.error==="PROFILE_ALREADY_SUBMITTED"){
    const current=await fetch(API_URL+"/v1/candidate/profile",{credentials:"include"});
    const currentBody=await current.json().catch(()=>({}));
    if(current.ok&&currentBody.profile?.candidate_code)return {profile:currentBody.profile,already_submitted:true};
  }
  if(!r.ok)throw Object.assign(new Error(body.error??"REQUEST_FAILED"),{status:r.status,body});
  return body;
}
