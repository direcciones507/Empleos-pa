"use client";
import {useEffect,useState} from "react";
import {api} from "../../lib/api";
export default function ElegirPerfil(){const [profiles,setProfiles]=useState<string[]>([]);useEffect(()=>{api("/v1/auth/me").then(x=>setProfiles(x.user.profiles??[])).catch(()=>location.href="/login")},[]);return <main className="accountPage"><section className="accountCard"><a className="miniBrand" href="/">Empleos<span>.pa</span></a><h1>¿Qué quieres hacer?</h1><p>Elige el contexto que quieres usar ahora. Puedes cambiar después sin cerrar sesión.</p>{profiles.includes("CANDIDATO")&&<a className="contextChoice" href="/candidato">Buscar empleo</a>}{profiles.includes("EMPRESA")&&<a className="contextChoice" href="/empresa">Publicar / gestionar vacantes</a>}</section></main>}
