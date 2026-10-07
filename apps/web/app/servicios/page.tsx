"use client";

import {useEffect,useState} from "react";
import {api} from "../../lib/api";
import {LogoutButton} from "../../components/LogoutButton";

export default function ServiciosPortal(){
  const [profile,setProfile]=useState<any>(null);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{api("/v1/service-provider/profile").then(x=>setProfile(x.profile??null)).catch(()=>setProfile(null)).finally(()=>setLoaded(true));},[]);
  return <main className="portal">
    <header><strong>Empleos.pa</strong><div className="headerActions"><span>Portal de servicios</span><LogoutButton/></div></header>
    <section>
      <p className="eyebrowDark">TU PERFIL DE SERVICIOS</p>
      <h1>{!loaded?"Cargando tu perfil…":profile?"Tu perfil de servicios.":"Crea tu perfil de servicios."}</h1>
      <p>{profile?"Administra la información con la que ofrecerás tus servicios, oficio o actividad profesional.":"Registra tus datos de servicio para que Empleos.pa pueda conectarte con solicitudes compatibles."}</p>
      <div className="portalActions">
        <a className="portalAction" href="/servicios/ofrecer">{profile?"Actualizar mi perfil de servicios":"Crear mi perfil de servicios"}</a>
        <a className="portalAction secondaryPortal" href="/candidato">Mi perfil de candidato</a>
      </div>
    </section>
  </main>;
}
