import type {Role} from "./auth.js";
export type PublicProfile="CANDIDATO"|"EMPRESA";
export function publicProfile(value:unknown):PublicProfile|undefined{return value==="CANDIDATO"||value==="EMPRESA"?value:undefined;}
export function normalizeProfiles(values:unknown):PublicProfile[]{if(!Array.isArray(values))return [];return [...new Set(values.filter((x):x is PublicProfile=>x==="CANDIDATO"||x==="EMPRESA"))].sort();}
export function hasRole(user:{role:Role;profiles:PublicProfile[]},required:Role){return required==="ADMIN"?user.role==="ADMIN":user.profiles.includes(required);}
export function addPublicProfile(profiles:PublicProfile[],profile:PublicProfile){return normalizeProfiles([...profiles,profile]);}
export function destinationFor(user:{role:Role;profiles:PublicProfile[]},requested:unknown,returnTo:unknown){const profile=publicProfile(requested),safe=typeof returnTo==="string"&&returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/";if(profile&&user.profiles.includes(profile)){const prefix=profile==="CANDIDATO"?"/candidato":"/empresa";return safe.startsWith(prefix)?safe:prefix;}if(user.role==="ADMIN")return "/admin";if(user.profiles.length===1)return user.profiles[0]==="CANDIDATO"?"/candidato":"/empresa";if(user.profiles.length>1)return "/elegir-perfil";return "/registro?oauth=choose-role";}

