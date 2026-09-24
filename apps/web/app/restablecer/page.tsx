"use client";
import {FormEvent,useEffect,useState} from "react";
import {api} from "../../lib/api";
export default function Restablecer(){
 const [token,setToken]=useState(""),[msg,setMsg]=useState("");
 useEffect(()=>{setToken(new URLSearchParams(location.search).get("token")||"");},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget),password=String(f.get("password")||"");
  if(password.length<10){setMsg("Usa una contraseña de al menos 10 caracteres.");return;}
  try{await api("/v1/auth/password/reset",{method:"POST",body:JSON.stringify({token,password})});setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");}
  catch{setMsg("El enlace venció o ya fue utilizado.");}
 }
 return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>Nueva contraseña</h1>{token?<form onSubmit={submit}><label>Nueva contraseña<input name="password" type="password" minLength={10} required autoComplete="new-password"/></label><button className="submit">Guardar contraseña</button></form>:<p className="formError">El enlace no es válido.</p>}{msg&&<p className="saveMsg">{msg}</p>}<small><a href="/login">Ir a iniciar sesión</a></small></section></main>;
}