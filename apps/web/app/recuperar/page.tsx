"use client";
import {FormEvent,useState} from "react";
import {api} from "../../lib/api";
export default function Recuperar(){
 const [msg,setMsg]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);
  try{await api("/v1/auth/password/forgot",{method:"POST",body:JSON.stringify({email:f.get("email")})});setMsg("Si existe una cuenta con ese correo, recibirás instrucciones para continuar.");}
  catch{setMsg("No pudimos procesar la solicitud. Intenta nuevamente.");}
 }
 return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>Recuperar contraseña</h1><p>Escribe el correo de tu cuenta.</p><form onSubmit={submit}><label>Correo<input name="email" type="email" required autoComplete="email"/></label><button className="submit">Continuar</button></form>{msg&&<p className="saveMsg" role="status" aria-live="polite">{msg}</p>}<small><a href="/login">Volver a iniciar sesión</a></small></section></main>;
}