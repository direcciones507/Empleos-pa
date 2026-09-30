"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

export default function Reportes(){
  const [s,setS]=useState<any>(null),[error,setError]=useState("");
  useEffect(()=>{api("/v1/admin/summary").then(setS).catch(()=>setError("No se pudo cargar el reporte."))},[]);
  return <main className="admin"><header><a href="/admin">Empleos.pa</a><span>Reportes</span></header><section>
    <p className="eyebrowDark">ADMINISTRACIÓN</p><h1>Reporte operativo</h1>
    <p>Resumen calculado con los datos administrativos actuales de Empleos.pa.</p>
    {error&&<p className="formError">{error}</p>}
    <h2>Hoy</h2><div className="metrics">
      <Card n="Candidatos nuevos" v={s?.new_candidates?.today??0}/>
      <Card n="Ingresos aprobados" v={"$"+(s?.revenue_periods?.today??"0")}/>
      <Card n="Avisos sin leer" v={s?.unread_candidate_notices??0}/>
    </div>
    <h2>Últimos 7 días</h2><div className="metrics">
      <Card n="Candidatos nuevos" v={s?.new_candidates?.last_7_days??0}/>
      <Card n="Ingresos aprobados" v={"$"+(s?.revenue_periods?.last_7_days??"0")}/>
      <Card n="Candidatos por vencer" v={s?.candidates_expiring_7_days??0}/>
    </div>
    <h2>Últimos 30 días</h2><div className="metrics">
      <Card n="Candidatos nuevos" v={s?.new_candidates?.last_30_days??0}/>
      <Card n="Ingresos aprobados" v={"$"+(s?.revenue_periods?.last_30_days??"0")}/>
    </div>
    <h2>Estado actual</h2><div className="metrics">
      <Card n="Candidatos activos" v={s?.candidates?.ACTIVO??0}/>
      <Card n="Empresas" v={s?.companies??0}/>
      <Card n="Vacantes aprobadas" v={s?.vacancies?.APROBADA??0}/>
      <Card n="Pagos en revisión" v={s?.payments?.EN_REVISION??0}/>
      <Card n="Entregas enviadas" v={s?.deliveries_sent??0}/>
    </div>
  </section></main>
}
function Card({n,v}:any){return <article className="metric"><span>{n}</span><strong>{v}</strong></article>}
