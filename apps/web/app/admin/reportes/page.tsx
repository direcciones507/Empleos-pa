"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";

type Period="today"|"week"|"month"|"current";
export default function Reportes(){
  const [s,setS]=useState<any>(null),[error,setError]=useState(""),[period,setPeriod]=useState<Period>("today");
  useEffect(()=>{api("/v1/admin/summary").then(setS).catch(()=>setError("No se pudo cargar el reporte."))},[]);
  const periods:{key:Period;label:string}[]=[{key:"today",label:"Hoy"},{key:"week",label:"7 días"},{key:"month",label:"30 días"},{key:"current",label:"Estado actual"}];
  return <main className="admin"><header><a href="/admin">Empleos.pa</a><span>Reportes</span></header><section>
    <p className="eyebrowDark">ADMINISTRACIÓN</p><h1>Reporte operativo</h1>
    <p>Consulta el movimiento por período sin mezclarlo con el estado actual de la plataforma.</p>
    {error&&<p className="formError">{error}</p>}
    <div className="adminLinks">{periods.map(x=><button type="button" key={x.key} onClick={()=>setPeriod(x.key)} aria-pressed={period===x.key}>{x.label}</button>)}</div>
    {period==="today"&&<><h2>Hoy</h2><div className="metrics"><Card n="Candidatos nuevos" v={s?.new_candidates?.today??0}/><Card n="Ingresos aprobados" v={money(s?.revenue_periods?.today)}/><Card n="Avisos sin leer" v={s?.unread_candidate_notices??0}/><Card n="Entregas enviadas · total" v={s?.deliveries_sent??0}/></div></>}
    {period==="week"&&<><h2>Últimos 7 días</h2><div className="metrics"><Card n="Candidatos nuevos" v={s?.new_candidates?.last_7_days??0}/><Card n="Ingresos aprobados" v={money(s?.revenue_periods?.last_7_days)}/><Card n="Candidatos por vencer" v={s?.candidates_expiring_7_days??0}/></div></>}
    {period==="month"&&<><h2>Últimos 30 días</h2><div className="metrics"><Card n="Candidatos nuevos" v={s?.new_candidates?.last_30_days??0}/><Card n="Ingresos aprobados" v={money(s?.revenue_periods?.last_30_days)}/></div></>}
    {period==="current"&&<><h2>Estado actual</h2><div className="metrics"><Card n="Candidatos activos" v={s?.candidates?.ACTIVO??0}/><Card n="Empresas" v={s?.companies??0}/><Card n="Vacantes aprobadas" v={s?.vacancies?.APROBADA??0}/><Card n="Pagos en revisión" v={s?.payments?.EN_REVISION??0}/><Card n="Entregas enviadas" v={s?.deliveries_sent??0}/><Card n="Ingresos aprobados · total" v={money(s?.revenue)}/></div></>}
  </section></main>
}
function money(v:any){return "$"+Number(v??0).toFixed(2)}
function Card({n,v}:any){return <article className="metric"><span>{n}</span><strong>{v}</strong></article>}
