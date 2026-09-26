"use client";
import {useEffect,useState} from "react";
import {api} from "../lib/api";
export function ProfileSwitch({current}:{current:"CANDIDATO"|"EMPRESA"}){const target=current==="CANDIDATO"?"EMPRESA":"CANDIDATO",[enabled,setEnabled]=useState(false);useEffect(()=>{api("/v1/auth/me").then(x=>setEnabled(Boolean(x.user.profiles?.includes(target)))).catch(()=>{})},[target]);async function change(){if(!enabled)await api("/v1/auth/profiles/"+target+"/enable",{method:"POST"});location.href=target==="EMPRESA"?"/empresa":"/candidato";}return <button className="profileSwitch" onClick={change}>{target==="EMPRESA"?"Cambiar a Empresa":"Cambiar a Buscar empleo"}</button>}
