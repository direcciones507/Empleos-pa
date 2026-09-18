function required(name:string){const value=process.env[name];if(!value)throw new Error(`Missing required environment variable: ${name}`);return value;}
export const config={port:Number(process.env.PORT??3001),host:process.env.HOST??"0.0.0.0",databaseUrl:required("DATABASE_URL"),nodeEnv:process.env.NODE_ENV??"development"};
