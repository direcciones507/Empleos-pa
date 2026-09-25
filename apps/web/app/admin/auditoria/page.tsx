"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

export default function AuditPage(){
  const [items,setItems]=useState<any[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{api("/v1/admin/audit?limit=100").then(data=>setItems(data.items||[])).catch(()=>setError("No se pudo cargar el historial."));},[]);
  return <main className="admin">
    <header><strong>Empleos.pa</strong><span>Auditoría</span></header>
    <section>
      <p className="eyebrowDark">TRAZABILIDAD</p>
      <h1>Historial administrativo</h1>
      {error&&<p className="formError">{error}</p>}
      <div className="adminList">
        {items.length===0&&!error?<p>No hay acciones registradas.</p>:items.map(item=><article key={item.audit_id}>
          <div><strong>{item.action}</strong><p>{item.entity_type} · {item.entity_id}</p><p>{item.admin_email||"Administrador"} · {new Date(item.created_at).toLocaleString("es-PA")}</p></div>
        </article>)}
      </div>
      <div className="adminLinks"><a href="/admin">Volver al panel</a></div>
    </section>
  </main>;
}
