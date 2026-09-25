import type {PoolClient} from "pg";
import {db} from "./db.js";

type AuditInput={adminUserId:string;action:string;entityType:string;entityId:string;metadata?:Record<string,unknown>};

export async function writeAdminAudit(input:AuditInput,client?:PoolClient){
  const runner=client??db;
  await runner.query("insert into admin_audit_log(admin_user_id,action,entity_type,entity_id,metadata) values($1,$2,$3,$4,$5::jsonb)",[input.adminUserId,input.action,input.entityType,input.entityId,JSON.stringify(input.metadata??{})]);
}
