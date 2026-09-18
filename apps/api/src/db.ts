import pg from "pg";
import {config} from "./config.js";
export const db=new pg.Pool({connectionString:config.databaseUrl,ssl:config.nodeEnv==="production"?{rejectUnauthorized:false}:undefined,max:10});
export async function databaseReady(){const result=await db.query("select 1 as ok");return result.rows[0]?.ok===1;}
