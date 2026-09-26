import crypto from "node:crypto";
import type {FastifyInstance} from "fastify";
import "@fastify/cookie";
import {db} from "./db.js";
import {normalizeEmail,type Role} from "./auth.js";
import {canSelfReactivateWithGoogle} from "./account-reactivation.js";
import {destinationFor,normalizeProfiles,publicProfile} from "./profiles.js";

const SESSION_COOKIE="empleos_session";
const REACTIVATION_COOKIE="empleos_reactivation";
const digest=(value:string)=>crypto.createHash("sha256").update(value).digest("hex");
const random=()=>crypto.randomBytes(32).toString("base64url");
const isProduction=process.env.NODE_ENV==="production";
const sessionCookie={httpOnly:true,sameSite:(isProduction?"none":"lax") as "none"|"lax",secure:isProduction,path:"/"};
const reactivationCookie={httpOnly:true,sameSite:"strict" as const,secure:isProduction,path:"/v1/auth/google/reactivate"};

function settings(){
  const clientId=(process.env.GOOGLE_CLIENT_ID??"").trim();
  const clientSecret=(process.env.GOOGLE_CLIENT_SECRET??"").trim();
  const redirectUri=(process.env.GOOGLE_REDIRECT_URI??"").trim();
  const webUrl=(process.env.WEB_URL??"").trim();
  if(!clientId||!clientSecret||!redirectUri||!webUrl)throw new Error("Google OAuth is not configured");
  let redirect:URL,web:URL;
  try{redirect=new URL(redirectUri);web=new URL(webUrl);}catch{throw new Error("Google OAuth URLs are invalid");}
  if(!["http:","https:"].includes(redirect.protocol)||!["http:","https:"].includes(web.protocol))throw new Error("Google OAuth URLs are invalid");
  if(isProduction&&(redirect.protocol!=="https:"||web.protocol!=="https:"))throw new Error("Google OAuth requires HTTPS in production");
  return {clientId,clientSecret,redirectUri:redirect.toString(),webUrl:web.toString().replace(/\/$/,"")};
}

function safeReturn(value:unknown){return typeof value==="string"&&value.startsWith("/")&&!value.startsWith("//")?value:"/";}

function reactivationPage(){
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reactivar cuenta · Empleos.pa</title></head><body><main><h1>Reactivar cuenta</h1><p>Esta cuenta fue deshabilitada por solicitud del usuario. Puedes reactivarla conservando el mismo perfil y tipo de cuenta.</p><form method="post" action="/v1/auth/google/reactivate"><input type="hidden" name="confirm" value="REACTIVAR"><button type="submit">Reactivar mi cuenta</button></form><p><a href="${settings().webUrl}/login">Cancelar</a></p></main></body></html>`;
}

export async function googleOAuthRoutes(app:FastifyInstance){
  app.addContentTypeParser("application/x-www-form-urlencoded",{parseAs:"string"},(_req,_body,done)=>done(null,{}));

  app.get("/v1/auth/google/start",async(req:any,reply)=>{
    const s=settings();
    const role:Role|undefined=req.query?.role==="CANDIDATO"||req.query?.role==="EMPRESA"?req.query.role:undefined;
    const state=random();
    await db.query("insert into oauth_states(state_hash,provider,requested_role,return_to,expires_at) values($1,'google',$2,$3,now()+interval '10 minutes')",[digest(state),role??null,safeReturn(req.query?.returnTo)]);
    const params=new URLSearchParams({client_id:s.clientId,redirect_uri:s.redirectUri,response_type:"code",scope:"openid email profile",state,prompt:"select_account"});
    return reply.redirect("https://accounts.google.com/o/oauth2/v2/auth?"+params);
  });

  app.get("/v1/auth/google/callback",async(req:any,reply)=>{
    const s=settings();
    const {code,state}=req.query??{};
    if(typeof code!=="string"||typeof state!=="string"||code.length<1||code.length>4096||state.length<20||state.length>500)return reply.code(400).send({error:"INVALID_OAUTH_CALLBACK"});
    const client=await db.connect();
    try{
      await client.query("begin");
      const stateResult=await client.query("select requested_role,return_to from oauth_states where state_hash=$1 and provider='google' and used_at is null and expires_at>now() for update",[digest(state)]);
      if(!stateResult.rowCount){await client.query("rollback");return reply.code(400).send({error:"OAUTH_STATE_EXPIRED_OR_USED"});}
      await client.query("update oauth_states set used_at=now() where state_hash=$1",[digest(state)]);
      const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:s.clientId,client_secret:s.clientSecret,redirect_uri:s.redirectUri,grant_type:"authorization_code"})});
      if(!tokenResponse.ok)throw new Error("Google token exchange failed");
      const tokens:any=await tokenResponse.json();
      if(typeof tokens.access_token!=="string"||!tokens.access_token||tokens.access_token.length>8192)throw new Error("Google token response invalid");
      const userResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:`Bearer ${tokens.access_token}`}});
      if(!userResponse.ok)throw new Error("Google userinfo failed");
      const profile:any=await userResponse.json();
      if(typeof profile.sub!=="string"||profile.sub.length>255||typeof profile.email!=="string"||profile.email.length>320||profile.email_verified!==true){await client.query("rollback");return reply.code(400).send({error:"GOOGLE_EMAIL_NOT_VERIFIED"});}
      const email=normalizeEmail(profile.email);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){await client.query("rollback");return reply.code(400).send({error:"GOOGLE_EMAIL_NOT_VERIFIED"});}
      let userResult=await client.query("select user_id,email,role,status,google_subject,disabled_reason from users where google_subject=$1 or normalized_email=$2 order by (google_subject=$1) desc limit 1",[profile.sub,email]);
      if(userResult.rowCount){
        const user=userResult.rows[0];
        if(user.status!=="ACTIVE"){
          if(!canSelfReactivateWithGoogle(user,profile.sub)){await client.query("rollback");return reply.code(403).send({error:"ACCOUNT_DISABLED"});}
          const reactivationToken=random();
          await client.query("update account_reactivation_tokens set used_at=now() where user_id=$1 and used_at is null",[user.user_id]);
          await client.query("insert into account_reactivation_tokens(user_id,token_hash,return_to,requested_profile,expires_at) values($1,$2,$3,$4,now()+interval '10 minutes')",[user.user_id,digest(reactivationToken),safeReturn(stateResult.rows[0].return_to),publicProfile(stateResult.rows[0].requested_role)??null]);
          await client.query("commit");
          reply.setCookie(REACTIVATION_COOKIE,reactivationToken,{...reactivationCookie,maxAge:60*10});
          return reply.type("text/html; charset=utf-8").send(reactivationPage());
        }
        if(user.google_subject&&user.google_subject!==profile.sub){await client.query("rollback");return reply.code(409).send({error:"ACCOUNT_CONFLICT"});}
        if(!user.google_subject)await client.query("update users set google_subject=$1,email_verified_at=coalesce(email_verified_at,now()),updated_at=now() where user_id=$2",[profile.sub,user.user_id]);
        const requested=publicProfile(stateResult.rows[0].requested_role);
        if(requested&&user.role!=="ADMIN")await client.query("insert into user_profiles(user_id,profile_type) values($1,$2) on conflict do nothing",[user.user_id,requested]);
        userResult=await client.query("select u.user_id,u.email,u.role,coalesce(array_agg(up.profile_type order by up.profile_type) filter(where up.profile_type is not null),'{}') profiles from users u left join user_profiles up on up.user_id=u.user_id where u.user_id=$1 group by u.user_id,u.email,u.role",[user.user_id]);
      }else{
        const role=stateResult.rows[0].requested_role;
        if(!role){await client.query("rollback");return reply.redirect(s.webUrl+"/registro?oauth=choose-role");}
        userResult=await client.query("insert into users(email,normalized_email,google_subject,role,email_verified_at) values($1,$2,$3,$4,now()) returning user_id,email,role",[profile.email,email,profile.sub,role]);
        await client.query("insert into user_profiles(user_id,profile_type) values($1,$2)",[userResult.rows[0].user_id,role]);
        userResult.rows[0].profiles=[role];
      }
      const sessionToken=random();
      await client.query("insert into auth_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '14 days')",[userResult.rows[0].user_id,digest(sessionToken)]);
      await client.query("commit");
      reply.setCookie(SESSION_COOKIE,sessionToken,{...sessionCookie,maxAge:60*60*24*14});
      return reply.redirect(s.webUrl+destinationFor({role:userResult.rows[0].role,profiles:normalizeProfiles(userResult.rows[0].profiles)},stateResult.rows[0].requested_role,stateResult.rows[0].return_to));
    }catch(error){
      await client.query("rollback").catch(()=>{});
      throw error;
    }finally{client.release();}
  });

  app.post("/v1/auth/google/reactivate",async(req:any,reply)=>{
    const raw=req.cookies?.[REACTIVATION_COOKIE];
    if(typeof raw!=="string"||raw.length<20||raw.length>500)return reply.code(400).send({error:"REACTIVATION_EXPIRED_OR_USED"});
    const client=await db.connect();
    try{
      await client.query("begin");
      const result=await client.query(`select t.token_id,t.return_to,t.requested_profile,u.user_id,u.email,u.role,u.status,u.disabled_reason,u.google_subject
        from account_reactivation_tokens t join users u on u.user_id=t.user_id
        where t.token_hash=$1 and t.used_at is null and t.expires_at>now()
        for update of t,u`,[digest(raw)]);
      const row=result.rows[0];
      if(!row||row.status!=="DISABLED"||row.disabled_reason!=="USER_REQUEST"||!row.google_subject){
        await client.query("rollback");
        reply.clearCookie(REACTIVATION_COOKIE,reactivationCookie);
        return reply.code(403).send({error:"REACTIVATION_NOT_ALLOWED"});
      }
      await client.query("update account_reactivation_tokens set used_at=now() where token_id=$1",[row.token_id]);
      await client.query("update users set status='ACTIVE',disabled_at=null,disabled_reason=null,updated_at=now() where user_id=$1 and status='DISABLED' and disabled_reason='USER_REQUEST'",[row.user_id]);
      if(row.requested_profile&&row.role!=="ADMIN")await client.query("insert into user_profiles(user_id,profile_type) values($1,$2) on conflict do nothing",[row.user_id,row.requested_profile]);
      const profileRows=await client.query("select profile_type from user_profiles where user_id=$1 order by profile_type",[row.user_id]);
      const sessionToken=random();
      await client.query("insert into auth_sessions(user_id,token_hash,expires_at) values($1,$2,now()+interval '14 days')",[row.user_id,digest(sessionToken)]);
      await client.query("commit");
      reply.clearCookie(REACTIVATION_COOKIE,reactivationCookie);
      reply.setCookie(SESSION_COOKIE,sessionToken,{...sessionCookie,maxAge:60*60*24*14});
      return reply.code(303).redirect(settings().webUrl+destinationFor({role:row.role,profiles:profileRows.rows.map(x=>x.profile_type)},row.requested_profile,row.return_to));
    }catch(error){
      await client.query("rollback").catch(()=>{});
      throw error;
    }finally{client.release();}
  });
}
