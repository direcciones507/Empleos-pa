"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
type Profile=Record<string,unknown>;
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
export default function Curriculum(){
 const [remaining,setRemaining]=useState<number|null>(null),[profile,setProfile]=useState<Profile|null>(null),[template,setTemplate]=useState<"clasico"|"moderno">("clasico"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{api("/v1/candidate/cv/usage").then((r:any)=>setRemaining(r.free_remaining)).catch(()=>{});api("/v1/candidate/profile").then((r:any)=>setProfile(r.profile??null)).catch(()=>setError("No pudimos cargar tu perfil. Inicia sesión e inténtalo nuevamente."));},[]);
 async function generate(){
  if(!profile)return;
  setBusy(true);setError("");
  try{
   const {jsPDF}=await import("jspdf");
   const pdf=new jsPDF({unit:"mm",format:"a4"});
   const dark=template==="moderno"?"#194f77":"#25354a";
   pdf.setTextColor(dark);pdf.setFont("helvetica","bold");pdf.setFontSize(20);
   pdf.text(str(profile.full_name)||"Currículum",18,24);
   pdf.setFontSize(10);pdf.setFont("helvetica","normal");
   const contact=[str(profile.contact_email),str(profile.mobile_whatsapp),[str(profile.province),str(profile.district)].filter(Boolean).join(", ")].filter(Boolean).join("  |  ");
   pdf.text(pdf.splitTextToSize(contact,174),18,33);
   let y=49;
   const section=(title:string,value:string)=>{if(!value)return;const lines=pdf.splitTextToSize(value,172);const h=lines.length*5+13;if(y+h>276){pdf.addPage();y=22;}pdf.setFont("helvetica","bold");pdf.setFontSize(12);pdf.setTextColor(dark);pdf.text(title,18,y);y+=7;pdf.setFont("helvetica","normal");pdf.setFontSize(10);pdf.setTextColor("#263445");pdf.text(lines,18,y);y+=lines.length*5+9;};
   section("Perfil profesional",str(profile.work_profile));
   section("Área laboral",str(profile.primary_job_area));
   section("Habilidades",str(profile.skills));
   section("Idiomas",str(profile.languages));
   const entries=(value:unknown)=>Array.isArray(value)?value.map((v:any)=>typeof v==="string"?v:Object.values(v??{}).filter(x=>typeof x==="string"&&x.trim()).join(" · ")).filter(Boolean).join("\n"):"";
   section("Estudios",entries(profile.education));
   section("Experiencia",entries(profile.experience));
   const result=await api("/v1/candidate/cv/free-generate",{method:"POST",body:JSON.stringify({template})});setRemaining(result.free_remaining);pdf.save("curriculum-empleos-pa.pdf");
  }catch(e:any){setError(e?.body?.error==="FREE_LIMIT_REACHED"?"Ya utilizaste tus dos generaciones gratuitas.":e?.body?.error==="PROFILE_NOT_ACTIVE"?"Publica primero tu perfil para generar el PDF.":"No se pudo generar el PDF. Inténtalo nuevamente.");}finally{setBusy(false);}
 }
 return <main className="portal"><header><strong>Empleos.pa</strong><span>Currículum profesional</span></header><section><p className="eyebrowDark">GENERADOR DE CURRÍCULUM</p><h1>Elige tu diseño</h1><p>Utilizaremos los datos de tu perfil. Revisa tu información antes de descargar.</p><div className="portalActions"><button className="portalAction" onClick={()=>setTemplate("clasico")} aria-pressed={template==="clasico"}>Clásico {template==="clasico"?"✓":""}</button><button className="portalAction secondaryPortal" onClick={()=>setTemplate("moderno")} aria-pressed={template==="moderno"}>Moderno {template==="moderno"?"✓":""}</button></div><p>Generaciones gratuitas disponibles: <strong>{remaining===null?"Consultando…":remaining}</strong></p><p><strong>Currículum ejecutivo:</strong> tres plantillas por US$0.50 con Yappy y dos correcciones. Próximamente, cuando el pago esté habilitado.</p>{error&&<p className="saveMsg" role="alert">{error}</p>}<div className="portalActions"><button className="portalAction" disabled={!profile||busy||remaining===null||remaining<=0} onClick={generate}>{busy?"Generando…":"Descargar PDF gratuito"}</button><a className="portalAction secondaryPortal" href="/candidato">Ir a mi perfil</a></div></section></main>;
}
