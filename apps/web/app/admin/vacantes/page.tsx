"use client";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../../lib/api";

type Vacancy={vacancy_id:string;vacancy_code:string;status:string;request_type:string;position:string;quantity:number;work_location:string;package?:string;package_candidate_limit?:number;package_price?:number;created_at:string;company_name:string};
const statuses=["","RECIBIDA","PENDIENTE_PAGO","PAGO_EN_REVISION","APROBADA","EN_BUSQUEDA","ENTREGADA","CERRADA","CANCELADA"];
export default function VacantesAdmin(){
  const [items,setItems]=useState<Vacancy[]>([]),[status,setStatus]=useState(""),[q,setQ]=useState(""),[error,setError]=useState("");
  useEffect(()=>{setError("");api("/v1/admin/vacancies"+(status?`?status=${encodeURIComponent(status)}`:"")).then((r:any)=>setItems(r.items??[])).catch(()=>setError("No se pudieron cargar las vacantes."))},[status]);
  const vacancies=useMemo(()=>items.filter(x=>x.request_type==="VACANTE"&&matches(x,q)),[items,q]);
  const services=useMemo(()=>items.filter(x=>x.request_type==="EVENTUAL"&&matches(x,q)),[items,q]);
  return <main className="admin"><header><a href="/admin">Empleos.pa</a><span>Vacantes</span></header><section>
    <p className="eyebrowDark">ADMINISTRACIÓN</p><h1>Vacantes y solicitudes</h1>
    <p>Consulta las solicitudes laborales y de servicios sin mezclar ambos flujos.</p>
    {error&&<p className="formError">{error}</p>}
    <div className="filters"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar código, empresa, puesto o ubicación"/><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s?label(s):"Todos los estados"}</option>)}</select></div>
    <h2>Vacantes laborales <small>({vacancies.length})</small></h2><List items={vacancies}/>
    <h2>Servicios solicitados <small>({services.length})</small></h2><List items={services}/>
  </section></main>;
}
function matches(x:Vacancy,q:string){const s=q.trim().toLowerCase();if(!s)return true;return [x.vacancy_code,x.company_name,x.position,x.work_location].some(v=>String(v??"").toLowerCase().includes(s));}
function label(v:string){return v.toLowerCase().replaceAll("_"," ");}
function List({items}:{items:Vacancy[]}){if(!items.length)return <p>No hay registros para este filtro.</p>;return <div className="adminList">{items.map(x=><a className="adminListItem" href={`/admin/vacantes/${encodeURIComponent(x.vacancy_code)}`} key={x.vacancy_id}><strong>{x.vacancy_code} · {x.position||"Sin título"}</strong><span>{x.company_name} · {x.work_location||"Sin ubicación"}</span><span>{label(x.status)} · Cantidad: {x.quantity??0}</span></a>)}</div>}
