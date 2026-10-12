import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {registerOriginProtection,clientRateLimitIp} from './request-security.js';
test('Railway IP: separate users, reject forwarded chains and untrusted paths',()=>{
 const req=(real:string,host='api.empleospa.com')=>({ip:'proxy',headers:{host,'x-real-ip':real,'x-forwarded-for':'forged'}});
 assert.equal(clientRateLimitIp(req('203.0.113.1'),true,['api.empleospa.com']),'203.0.113.1');
 assert.equal(clientRateLimitIp(req('203.0.113.2'),true,['api.empleospa.com']),'203.0.113.2');
 for(const r of [req('1.2.3.4, 5.6.7.8'),req('invalid'),req('1.2.3.4','api.railway.internal')])assert.equal(clientRateLimitIp(r,true,['api.empleospa.com']),'proxy');
 assert.equal(clientRateLimitIp(req('1.2.3.4'),false,['api.empleospa.com']),'proxy');
});
test('CSRF: unsafe cookie requests require an approved browser origin',async()=>{
 const app=Fastify();registerOriginProtection(app,['https://empleospa.com']);app.post('/change',async()=>({ok:true}));
 for(const headers of [{origin:'https://evil.test'}, {cookie:'empleos_session=x'}, {'sec-fetch-site':'cross-site'}, {origin:'null'}])assert.equal((await app.inject({method:'POST',url:'/change',headers})).statusCode,403);
 for(const headers of [{cookie:'empleos_session=x',origin:'https://empleospa.com'},{cookie:'empleos_session=x',referer:'https://empleospa.com/cuenta'},{}])assert.equal((await app.inject({method:'POST',url:'/change',headers})).statusCode,200);
 await app.close();
});
