"use client";
import Script from "next/script";
import {useEffect,useRef,useState} from "react";
import {api} from "../../../lib/api";

export default function YappyPrueba(){
 const host=useRef<HTMLDivElement>(null),button=useRef<any>(null),[alias,setAlias]=useState(""),[msg,setMsg]=useState(""),[ready,setReady]=useState(false),[last,setLast]=useState<string>("");
 function mount(){
  if(!host.current||button.current)return;
  const el:any=document.createElement("btn-yappy");el.setAttribute("theme","blue");el.setAttribute("rounded","true");host.current.appendChild(el);button.current=el;setReady(true);
  el.addEventListener("eventClick",async()=>{setMsg("Creando solicitud segura de Yappy…");try{const x=await api("/v1/company/payments/yappy/test",{method:"POST",body:JSON.stringify({aliasYappy:alias})});setLast(x.orderId);setMsg("Solicitud enviada a Yappy. Confírmala en tu celular.");el.eventPayment({transactionId:x.transactionId,documentName:x.documentName,token:x.token});}catch(e:any){setMsg(e?.body?.error==="YAPPY_ALIAS_INVALID"?"Escribe tu número Yappy de 8 dígitos.":"No se pudo iniciar el pago con Yappy.");}});
  el.addEventListener("eventSuccess",()=>setMsg("Yappy reportó la transacción como ejecutada. Confirmando con el servidor…"));
  el.addEventListener("eventError",()=>setMsg("La transacción no se completó."));
 }
 useEffect(()=>{const id=setInterval(()=>{if((window as any).customElements?.get("btn-yappy")){clearInterval(id);mount()}},250);return()=>clearInterval(id)},[alias]);
 useEffect(()=>{if(!last)return;const id=setInterval(()=>api("/v1/company/payments/yappy/"+last).then(x=>{const s=x.payment?.status;if(s==="EXECUTED"){setMsg("✓ Pago confirmado por Yappy.");clearInterval(id)}else if(["REJECTED","CANCELLED","EXPIRED"].includes(s)){setMsg("El pago terminó como "+s.toLowerCase()+".");clearInterval(id)}}).catch(()=>{}),1500);return()=>clearInterval(id)},[last]);
 return <main className="portal"><Script type="module" src="https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js" onLoad={mount}/><header><a href="/empresa">Empleos.pa</a><span>Prueba Yappy</span></header><section><p className="eyebrowDark">PAGO CON YAPPY</p><h1>Prueba de integración</h1><p>Esta pantalla realiza una transacción real de <strong>$0.01</strong> únicamente cuando presionas el botón y confirmas el pago en Yappy.</p><label className="wfield">Número celular registrado en Yappy<input inputMode="numeric" autoComplete="tel" value={alias} maxLength={8} onChange={e=>setAlias(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="6XXXXXXX"/></label><div className="infoBox"><strong>Monto de prueba: $0.01</strong><p>El pago solo se marcará como confirmado cuando el backend reciba y valide la notificación firmada de Yappy.</p><div ref={host} style={{marginTop:16,minHeight:48}}/>{!ready&&<p>Cargando botón oficial de Yappy…</p>}</div><p className="saveMsg" role="status" aria-live="polite">{msg}</p><a href="/empresa">← Volver al portal</a></section></main>;
}
