"use client";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../../lib/api";

export default function Empresas(){
  const [items,setItems]=useState<any[]>([]),[msg,setMsg]=useState(""),[q,setQ]=useState("");
  useEffect(()=>{api("/v1/admin/company-activity").then(x=>setItems(x.items??[])).catch(()=>setMsg("No se pudieron cargar las empresas."))},[]);
  const stats=useMemo(()=>({total:items.length,active:items.filter(x=>Number(x.active_requests)>0).length,requests:items.reduce((n,x)=>n+Number(x.requests_total??0),0),services:items.reduce((n,x)=>n+Number(x.services_total??0),0)}),[items]);
  const visible=useMemo(()=>{const s=q.trim().toLowerCase();if(!s)return items;return items.filter(x=>[x.name,x.contact_name,x.phone,x.email,x.province,x.district].some(v=>String(v??"").toLowerCase().includes(s)))},[items,q]);
  return <main className="admin"><header><a href="/admin">Empleos.pa</a><span>Empresas</span></header><section>
    <p className="eyebrowDark">ADMINISTRACIÓN</p><h1>Empresas</h1>
    <div className="metrics"><Card n="Registradas" v={stats.total}/><Card n="Con actividad actual" v={stats.active}/><Card n="Solicitudes · total" v={stats.requests}/><Card n="Servicios solicitados" v={stats.services}/></div>
    <div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar empresa, contacto, teléfono, correo o ubicación"/></div>
    <p className="saveMsg">{msg}</p><div className="adminList">{visible.length===0&&!msg?<p>No hay empresas para este filtro.</p>:visible.map(x=><article key={x.company_id}><div><strong>{x.name}</strong><p>{x.contact_name||"Sin contacto"} · {x.phone||"Sin teléfono"} · {x.email||"Sin correo"}</p><p>{[x.province,x.district].filter(Boolean).join(", ")||"Sin ubicación"} · Registro: {x.created_at?String(x.created_at).slice(0,10):"pendiente"}</p><p>Vacantes: {x.vacancies_total??0} · Servicios: {x.services_total??0} · Activas: {x.active_requests??0}{x.last_request_at?` · Última solicitud: ${String(x.last_request_at).slice(0,10)}`:""}</p></div></article>)}</div>
  </section></main>
}
function Card({n,v}:any){return <article className="metric"><span>{n}</span><strong>{v}</strong></article>}
