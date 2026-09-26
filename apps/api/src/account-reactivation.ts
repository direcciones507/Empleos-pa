import type {Role} from "./auth.js";

export type ReactivationUser={
  status:string;
  disabled_reason:string|null;
  google_subject:string|null;
  role:Role;
};

export function canSelfReactivateWithGoogle(user:ReactivationUser,googleSubject:string){
  return user.status==="DISABLED"&&
    user.disabled_reason==="USER_REQUEST"&&
    typeof user.google_subject==="string"&&
    user.google_subject.length>0&&
    user.google_subject===googleSubject;
}

export function panelForRole(role:Role){
  if(role==="CANDIDATO")return "/candidato";
  if(role==="EMPRESA")return "/empresa";
  return "/admin";
}

export function roleReturn(role:Role,requested:unknown){
  const destination=typeof requested==="string"&&requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";
  if(role==="CANDIDATO")return destination.startsWith("/candidato")?destination:panelForRole(role);
  if(role==="EMPRESA")return destination.startsWith("/empresa")?destination:panelForRole(role);
  return panelForRole(role);
}
