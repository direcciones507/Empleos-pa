"use client";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../../lib/api";

export default function Empresas(){
  const [items,setItems]=useState<any[]>([]),[msg,setMsg]=useState("");
  useEffect(()=>{api("/v1/admin/companies").then(x=>setItems(x.items)).catch(()=>setMsg("No se pudieron cargar las empresas."))},[]);
  const stats=useMemo(()=>({total:items.length,withLocation:items.filter(x=>x.province||x.district).length,withContact:items.filter(x=>x.contact_name).length}),[items]);
  return <main className="admin"><header><a href="/admin">Empleos.pa</a><span>Empresas</span></header><section>
    <p className="eyebrowDark">ADMINISTRACIÓN</p><h1>Empresas</h1>
    <div className="metrics"><Card n="Registradas" v={stats.total}/><Card n="Con contacto" v={stats.withContact}/><Card n="Con ubicación" v={stats.withLocation}/></div>
    <p className="saveMsg">{msg}</p><div className="adminList">{items.length===0&&!msg?<p>No hay empresas registradas.</p>:items.map(x=><article key={x.company_id}><div><strong>{x.name}</strong><p>{x.contact_name||"Sin contacto"} · {[x.province,x.district].filter(Boolean).join(", ")||"Sin ubicación"} · Registro: {x.created_at?String(x.created_at).slice(0,10):"pendiente"}</p></div></article>)}</div>
  </section></main>
}
function Card({n,v}:any){return <article className="metric"><span>{n}</span><strong>{v}</strong></article>}
