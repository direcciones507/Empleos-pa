import type {FastifyInstance} from 'fastify';
import {isIP} from 'node:net';

// Public Railway ingress overwrites X-Real-IP. Never enable this for direct
// internet listeners or untrusted private-network callers; XFF is not consumed.
export function clientRateLimitIp(req:any, railwayPublicIngress:boolean, publicHosts:string[]) {
  const host=String(req.headers.host??'').toLowerCase().split(':')[0];
  const real=req.headers['x-real-ip'];
  if(railwayPublicIngress && publicHosts.includes(host) && typeof real==='string' && isIP(real))return real;
  return req.ip;
}
export function registerOriginProtection(app:FastifyInstance,origins:string[]){
  const allowed=new Set(origins.map(x=>new URL(x).origin));
  app.addHook('onRequest',async(req,reply)=>{
    if(['GET','HEAD','OPTIONS'].includes(req.method))return;
    const origin=req.headers.origin;
    if(origin!==undefined&&!allowed.has(String(origin)))return reply.code(403).send({error:'ORIGIN_NOT_ALLOWED'});
    if(req.headers['sec-fetch-site']==='cross-site'&&!origin)return reply.code(403).send({error:'ORIGIN_REQUIRED'});
    if(/(?:^|;\s*)empleos_session=/.test(String(req.headers.cookie??''))&&!origin){
      let referring='';try{referring=new URL(String(req.headers.referer??'')).origin;}catch{}
      if(!allowed.has(referring))return reply.code(403).send({error:'ORIGIN_REQUIRED'});
    }
  });
}
