import {config} from "./config.js";

export type CandidateAiInput={
  candidate_id:string;candidate_code:string|null;primary_job_area:string|null;province:string|null;district:string|null;
  work_profile:string|null;skills:string|null;education:unknown;experience:unknown;availability_notes:string|null;
  match_trace:unknown;
};
export type VacancyAiInput={
  vacancy_code:string;position:string;work_location:string;skills:string|null;minimum_education:string|null;
  experience_requirement:string|null;schedule:string|null;
};
export type CandidateAiAnalysis={
  candidate_id:string;
  summary:string;
  strengths:string[];
  gaps:string[];
  considerations:string[];
};
export type AiAnalysisResult={provider:"deepseek";model:string;analyses:CandidateAiAnalysis[]};

const SYSTEM_PROMPT=`Eres un asistente de análisis laboral para Empleos.pa. Recibes una vacante y candidatos que YA pasaron filtros estructurados. Analiza únicamente evidencia suministrada. No inventes datos. No uses ni infieras atributos sensibles. No asignes puntuaciones, porcentajes, rankings, ganadores, etiquetas de mejor/peor ni decidas contratación. Devuelve análisis descriptivo por candidato con resumen, fortalezas relacionadas con la vacante, brechas observables y consideraciones que la empresa debe verificar. Devuelve JSON válido y nada más.`;

export function deepSeekConfigured(){return Boolean(config.deepSeekApiKey);}
export async function analyzeFilteredCandidates(vacancy:VacancyAiInput,candidates:CandidateAiInput[],signal?:AbortSignal):Promise<AiAnalysisResult>{
  if(!config.deepSeekApiKey)throw new Error("DEEPSEEK_NOT_CONFIGURED");
  if(!candidates.length)return {provider:"deepseek",model:config.deepSeekModel,analyses:[]};
  const response=await fetch(config.deepSeekBaseUrl.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+config.deepSeekApiKey},body:JSON.stringify({model:config.deepSeekModel,temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:SYSTEM_PROMPT},{role:"user",content:JSON.stringify({vacancy,candidates,output_schema:{analyses:[{candidate_id:"uuid",summary:"string",strengths:["string"],gaps:["string"],considerations:["string"]}]}})}]}),signal});
  if(!response.ok)throw new Error("DEEPSEEK_REQUEST_FAILED_"+response.status);
  const body:any=await response.json();const raw=body?.choices?.[0]?.message?.content;if(typeof raw!=="string")throw new Error("DEEPSEEK_INVALID_RESPONSE");
  let parsed:any;try{parsed=JSON.parse(raw);}catch{throw new Error("DEEPSEEK_INVALID_JSON");}
  if(!Array.isArray(parsed?.analyses))throw new Error("DEEPSEEK_INVALID_SCHEMA");
  const allowed=new Set(candidates.map(x=>x.candidate_id));
  const analyses:CandidateAiAnalysis[]=parsed.analyses.filter((x:any)=>x&&allowed.has(String(x.candidate_id))).map((x:any)=>({candidate_id:String(x.candidate_id),summary:String(x.summary??"").slice(0,1200),strengths:Array.isArray(x.strengths)?x.strengths.map(String).slice(0,10):[],gaps:Array.isArray(x.gaps)?x.gaps.map(String).slice(0,10):[],considerations:Array.isArray(x.considerations)?x.considerations.map(String).slice(0,10):[]}));
  return {provider:"deepseek",model:config.deepSeekModel,analyses};
}
