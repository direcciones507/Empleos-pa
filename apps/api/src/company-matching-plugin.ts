import type {FastifyInstance} from "fastify";
import {companyMatchingRoutes} from "./company-matching-routes.js";
import {config} from "./config.js";

const automaticVacancies=new Set<string>();

/**
 * Mount company matching and bridge newly-created FREE vacancies into the
 * existing matching/acceptance pipeline. The structured matcher remains the
 * eligibility authority; DeepSeek remains descriptive and non-decisional.
 */
export async function registerCompanyMatching(app:FastifyInstance){
  await companyMatchingRoutes(app);

  app.addHook("onSend",async(req,reply,payload)=>{
    if(config.requestPaymentMode!=="FREE"||req.method!=="POST"||req.url.split("?")[0]!=="/v1/company/vacancies"||reply.statusCode!==201)return payload;
    let code="";
    try{const body=typeof payload==="string"?JSON.parse(payload):payload as any;code=String(body?.vacancy?.vacancy_code??"");}catch{return payload;}
    if(!/^VAC-\d{6}$/.test(code)||automaticVacancies.has(code))return payload;
    const cookie=req.headers.cookie;
    if(!cookie)return payload;
    automaticVacancies.add(code);

    // Run after the response so vacancy creation stays fast. Every operation
    // reuses the authenticated company session and the already-tested routes.
    setImmediate(async()=>{
      try{
        const match=await app.inject({method:"GET",url:`/v1/company/vacancies/${code}/matches`,headers:{cookie}});
        if(match.statusCode!==200){
          app.log.error({vacancy_code:code,status:match.statusCode},"automatic vacancy matching lookup failed");
          return;
        }
        const result=match.json() as any;
        const ids=[...new Set<string>(Array.isArray(result?.analyses)?result.analyses.map((x:any)=>String(x?.candidate_id??"")).filter(Boolean):[])];
        if(!ids.length){
          app.log.info({vacancy_code:code},"automatic vacancy matching completed with zero candidates");
          return;
        }
        const accepted=await app.inject({method:"POST",url:`/v1/company/vacancies/${code}/candidates/accept`,headers:{cookie,"content-type":"application/json"},payload:{candidate_ids:ids,confirm_price:true}});
        if(accepted.statusCode<200||accepted.statusCode>=300){
          app.log.error({vacancy_code:code,status:accepted.statusCode},"automatic vacancy candidate acceptance failed");
          return;
        }
        app.log.info({vacancy_code:code,candidates:ids.length},"automatic vacancy matching completed");
      }catch(error){
        app.log.error({err:error,vacancy_code:code},"automatic vacancy matching failed");
      }finally{
        automaticVacancies.delete(code);
      }
    });
    return payload;
  });
}
