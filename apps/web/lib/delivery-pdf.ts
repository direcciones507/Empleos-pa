import {jsPDF} from "jspdf";
import {candidateLanguage} from "./candidate-language";

export function buildDeliveryPdf(delivery:any, analyses:any[]) {
  if (!delivery?.report || !delivery?.candidates?.length) throw new Error("NO_DELIVERY");
  const doc=new jsPDF({unit:"mm",format:"a4"});
  const margin=18, bottom=278, width=174;
  let y=22;
  function line(text:unknown, bold=false, size=10) {
    doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);
    const rows=doc.splitTextToSize(candidateLanguage(String(text??"")),width) as string[];
    const height=size*0.46;
    for(const row of rows){if(y+height>bottom){doc.addPage();y=22;}doc.text(row,margin,y);y+=height;}
    y+=2;
  }
  line("Empleos.pa",true,18);
  line(delivery.report.title,true,14);
  line(`Solicitud: ${delivery.report.vacancy_code} · ${delivery.report.position??""}`);
  line(`Ubicación: ${delivery.report.work_location??""}`);
  line(`Perfiles entregados: ${delivery.candidates.length}`);
  if(delivery.report.generated_at)line(`Entrega: ${new Date(delivery.report.generated_at).toLocaleDateString("es-PA")}`);
  for(const candidate of delivery.candidates){
    y+=5;if(y>240){doc.addPage();y=22;}
    line(`${candidate.candidate_code} · ${candidate.full_name}`,true,12);
    line([candidate.primary_job_area,candidate.province,candidate.district].filter(Boolean).join(" · "));
    line(candidate.work_profile??"");
    line(`Contacto: ${[candidate.phone,candidate.email].filter(Boolean).join(" · ")}`);
    line(`Habilidades: ${candidate.skills||"No indicadas"}`);
    const analysis=analyses.find(a=>a.candidate_code===candidate.candidate_code);
    if(analysis){
      line("Compatibilidad laboral",true);line(analysis.summary);
      for(const [title,key] of [["Fortalezas relacionadas","strengths"],["Por verificar","gaps"],["Consideraciones","considerations"]]){
        if(analysis[key]?.length){line(title,true);for(const item of analysis[key])line(`• ${item}`);}
      }
    }else line("Esta entrega no conserva un análisis descriptivo histórico.");
  }
  y+=4;line(delivery.report.notice||"Los datos corresponden al perfil declarado al momento de la entrega. La empresa verifica la información y decide la contratación.",false,9);
  const pages=doc.getNumberOfPages();
  for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.text(`Empleos.pa · ${delivery.report.vacancy_code} · ${i} / ${pages}`,margin,290);}
  return doc;
}
export async function saveDeliveryPdf(delivery:any,analyses:any[]) {
  const doc=buildDeliveryPdf(delivery,analyses);
  doc.save(`Empleos-pa-${delivery.report.vacancy_code}.pdf`);
}
