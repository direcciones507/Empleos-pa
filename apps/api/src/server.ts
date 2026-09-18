import Fastify from "fastify";
import cors from "@fastify/cors";
import {config} from "./config.js";
import {databaseReady,db} from "./db.js";
const app=Fastify({logger:true});
await app.register(cors,{origin:false});
app.get("/health",async()=>({status:"ok",service:"empleos-pa-api"}));
app.get("/ready",async(_request,reply)=>{try{const database=await databaseReady();return {status:"ready",database};}catch{reply.code(503);return {status:"not-ready",database:false};}});
async function shutdown(){await app.close();await db.end();process.exit(0);}
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
await app.listen({port:config.port,host:config.host});
