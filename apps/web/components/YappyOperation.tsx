"use client";
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';
export function YappyOperation({endpoint,amount,onConfirmed}:{endpoint:string;amount:number;onConfirmed?:()=>void}){
  const [enabled,setEnabled]=useState<boolean|null>(null),[alias,setAlias]=useState(''),[msg,setMsg]=useState(''),[order,setOrder]=useState(''),[ready,setReady]=useState(false);
  const host=useRef<HTMLDivElement>(null),button=useRef<any>(null),current=useRef({alias,endpoint});current.current={alias,endpoint};
  useEffect(()=>{api('/v1/company/payments/yappy/config').then(r=>setEnabled(r.enabled===true)).catch(()=>{setEnabled(false);setMsg('No se pudo comprobar la disponibilidad del pago.');});},[]);
  function mount(){
    if(!enabled||!host.current||button.current||!customElements.get('btn-yappy'))return;
    const el:any=document.createElement('btn-yappy');el.setAttribute('theme','blue');el.setAttribute('rounded','true');host.current.appendChild(el);button.current=el;setReady(true);
    let busy=false;
    el.addEventListener('eventClick',async()=>{
      if(busy)return;busy=true;setMsg('Preparando pago con el monto confirmado por el servidor…');
      try{const r=await api(current.current.endpoint,{method:'POST',body:JSON.stringify({aliasYappy:current.current.alias})});setOrder(r.orderId);if(r.status==='EXECUTED'){setMsg('Pago ya confirmado.');onConfirmed?.();return;}el.eventPayment({transactionId:r.transactionId,documentName:r.documentName,token:r.token});setMsg('Confirma la operación en Yappy. El contacto sigue bloqueado hasta la confirmación del servidor.');}
      catch(e:any){setMsg(e?.body?.error==='PAYMENTS_DISABLED'?'Los cobros están desactivados.':e?.body?.error==='YAPPY_ALIAS_INVALID'?'Escribe tu número Yappy de 8 dígitos.':e?.body?.error==='PAYMENT_INITIALIZING'?'Tu orden se está preparando. Actualiza antes de reintentar.':'No se pudo iniciar el pago. No se ha desbloqueado el contacto.');}
      finally{busy=false;}
    });
    el.addEventListener('eventSuccess',()=>setMsg('Yappy respondió. Esperando confirmación firmada del servidor…'));
    el.addEventListener('eventError',()=>setMsg('La operación no se completó.'));
  }
  useEffect(()=>{if(!enabled)return;mount();const timer=setInterval(()=>{mount();if(button.current)clearInterval(timer);},250);return()=>clearInterval(timer);},[enabled]);
  useEffect(()=>{if(!order)return;const timer=setInterval(()=>api('/v1/company/payments/yappy/'+order).then(r=>{
    const status=r.payment?.status;if(status==='EXECUTED'){clearInterval(timer);setMsg('Pago confirmado por el servidor.');onConfirmed?.();}
    else if(['REJECTED','CANCELLED','EXPIRED'].includes(status)){clearInterval(timer);setMsg('El pago no se completó.');}
  }).catch(()=>setMsg('No se pudo comprobar el pago. El contacto sigue protegido.')),1500);return()=>clearInterval(timer);},[order]);
  return <div className="infoBox"><strong>Monto de la operación: ${amount.toFixed(2)}</strong>{enabled===null?<p>Comprobando disponibilidad del pago…</p>:!enabled?<p>Los cobros están desactivados. No se generará una orden de pago.</p>:<><Script type="module" src="https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js" onLoad={mount}/><label className="wfield">Número celular registrado en Yappy<input value={alias} inputMode="numeric" maxLength={8} onChange={e=>setAlias(e.target.value.replace(/\D/g,'').slice(0,8))}/></label><div ref={host}/>{!ready&&<p>Cargando botón oficial de Yappy…</p>}</>}<p role="status" aria-live="polite">{msg}</p></div>;
}
