"use client";
import {FormEvent,useState} from "react";
import {api} from "../../lib/api";
export default function Recuperar(){
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMsg("");const f=new FormData(e.currentTarget);
  try{await api("/v1/auth/password/forgot",{method:"POST",body:JSON.stringify({email:f.get("email")})});setMsg("Si existe una cuenta con ese correo, recibirás instrucciones para continuar.");}
  catch(error:any){const reason=error?.body?.error;setMsg(reason==="EMAIL_NOT_CONFIGURED"?"El envío de enlaces de recuperación no está disponible todavía. Si creaste tu cuenta con Google, vuelve a iniciar sesión con Google.":reason==="EMAIL_DELIVERY_FAILED"?"No se pudo enviar el correo de recuperación. Intenta nuevamente más tarde.":error?.status===429?"Has realizado varias solicitudes. Espera unos minutos antes de intentar de nuevo.":"No pudimos procesar la solicitud. Intenta nuevamente.");}
  finally{setBusy(false);}
 }
 return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>Recuperar contraseña</h1><p>Escribe el correo de tu cuenta.</p><form onSubmit={submit}><label>Correo<input name="email" type="email" required autoComplete="email"/></label><button className="submit" disabled={busy}>{busy?"Procesando…":"Continuar"}</button></form>{msg&&<p className="saveMsg" role="status" aria-live="polite">{msg}</p>}<small><a href="/login">Volver a iniciar sesión</a></small></section></main>;
}