import type {FastifyReply,FastifyRequest} from "fastify";
import {sessionUser,type Role,type PublicProfile} from "./auth.js";
import {hasRole} from "./profiles.js";
export type AuthUser={user_id:string;email:string;role:Role;status:"ACTIVE";profiles:PublicProfile[];is_admin:boolean};
declare module "fastify"{interface FastifyRequest{authUser?:AuthUser}}
export function requireRoles(...roles:Role[]){return async function(req:FastifyRequest,reply:FastifyReply){const raw=req.cookies?.empleos_session;const user=await sessionUser(raw) as AuthUser|null;if(!user)return reply.code(401).send({error:"UNAUTHENTICATED"});if(!roles.some(role=>hasRole(user,role)))return reply.code(403).send({error:"FORBIDDEN"});req.authUser=user;};}
