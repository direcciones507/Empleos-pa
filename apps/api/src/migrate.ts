import {readdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import pg from "pg";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("Missing required environment variable: DATABASE_URL");
const here=dirname(fileURLToPath(import.meta.url));
const migrationsDir=join(here,"../../migrations");
const db=new pg.Client({connectionString:databaseUrl,ssl:false});

await db.connect();
try{
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied=new Set((await db.query("select name from schema_migrations")).rows.map(x=>x.name));
  const files=(await readdir(migrationsDir)).filter(x=>/^\d+.*\.sql$/.test(x)).sort();
  for(const name of files){
    if(applied.has(name))continue;
    const sql=await readFile(join(migrationsDir,name),"utf8");
    console.log("Applying",name);
    await db.query(sql);
    await db.query("insert into schema_migrations(name) values($1)",[name]);
  }
  console.log("Migrations up to date.");
}finally{await db.end();}
