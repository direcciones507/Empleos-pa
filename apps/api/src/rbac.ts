import type {FastifyReply,FastifyRequest} from "fastify";
import {sessionUser,type Role} from "./auth.js";
export type AuthUser={user_id:string;email:string;role:Role;status:"ACTIVE"};
declare module "fastify"{interface FastifyRequest{authUser?:AuthUser}}
export function requireRoles(...roles:Role[]){return async function(req:FastifyRequest,reply:FastifyReply){const raw=req.cookies?.empleos_session;const user=await sessionUser(raw) as AuthUser|null;if(!user)return reply.code(401).send({error:"UNAUTHENTICATED"});if(!roles.includes(user.role))return reply.code(403).send({error:"FORBIDDEN"});req.authUser=user;};}
