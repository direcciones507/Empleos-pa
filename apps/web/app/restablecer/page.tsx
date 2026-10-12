"use client";
import {FormEvent,useEffect,useState} from "react";
import {api} from "../../lib/api";
export default function Restablecer(){
 const [token,setToken]=useState(""),[msg,setMsg]=useState(""),[showPassword,setShowPassword]=useState(false);
 useEffect(()=>{setToken(new URLSearchParams(location.search).get("token")||"");},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget),password=String(f.get("password")||"");
  if(password.length<10){setMsg("Usa una contraseña de al menos 10 caracteres.");return;}
  try{await api("/v1/auth/password/reset",{method:"POST",body:JSON.stringify({token,password})});setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");}
  catch{setMsg("El enlace venció o ya fue utilizado.");}
 }
 return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>Nueva contraseña</h1>{token?<form onSubmit={submit}><label>Nueva contraseña<span style={{display:"flex",alignItems:"center",gap:8}}><input name="password" type={showPassword?"text":"password"} minLength={10} required autoComplete="new-password" style={{flex:1,minWidth:0}}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Ocultar contraseña":"Mostrar contraseña"} aria-pressed={showPassword} title={showPassword?"Ocultar contraseña":"Mostrar contraseña"} style={{flexShrink:0,padding:"10px",border:"1px solid #d7e0e8",borderRadius:8,background:"white",cursor:"pointer",color:"#10243e"}}>{showPassword?"🙈":"👁️"}</button></span></label><button className="submit">Guardar contraseña</button></form>:<p className="formError" role="alert">El enlace no es válido.</p>}{msg&&<p className="saveMsg" role="status" aria-live="polite">{msg}</p>}<small><a href="/login">Ir a iniciar sesión</a></small></section></main>;
}