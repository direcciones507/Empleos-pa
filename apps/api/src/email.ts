import {config} from "./config.js";

type Mail={to:string;subject:string;text:string};

export async function sendEmail(mail:Mail){
  if(!config.emailWebhookUrl)return {sent:false,reason:"EMAIL_NOT_CONFIGURED"};
  const response=await fetch(config.emailWebhookUrl,{
    method:"POST",
    headers:{"content-type":"application/json",...(config.emailWebhookSecret?{"authorization":"Bearer "+config.emailWebhookSecret}:{})},
    body:JSON.stringify({from:config.emailFrom,to:mail.to,subject:mail.subject,text:mail.text})
  });
  if(!response.ok)throw new Error("EMAIL_DELIVERY_FAILED");
  return {sent:true};
}
