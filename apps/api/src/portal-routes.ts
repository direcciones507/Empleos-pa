import type {FastifyInstance} from "fastify";
import {requireRoles} from "./rbac.js";
export async function portalRoutes(app:FastifyInstance){app.get("/v1/candidate/home",{preHandler:requireRoles("CANDIDATO")},async req=>({ok:true,role:req.authUser!.role}));app.get("/v1/company/home",{preHandler:requireRoles("EMPRESA")},async req=>({ok:true,role:req.authUser!.role}));}
