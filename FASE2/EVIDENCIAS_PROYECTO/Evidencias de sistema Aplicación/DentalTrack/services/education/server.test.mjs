import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe,it,expect,vi } from 'vitest';
import { createEducationHandler } from './server.mjs';

async function call(body,{token='test-token',user='test-user',quota=true,origin='http://127.0.0.1:8115'}={}){
 const answer=vi.fn(async()=>({status:'candidate',explanation:'Definición sintética.',sources:[{id:'S1',url:'https://example.org/dental',domain:'example.org'}]}));
 const consume=vi.fn(()=>quota);
 const server=createServer(createEducationHandler({verifyUser:async()=>user,answer,consume}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/explain`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null,answer,consume,cache:response.headers.get('cache-control')};
 }finally{await new Promise(resolve=>server.close(resolve));}
}
describe('contextual explanation service',()=>{
 it('sends only the public term after authentication and returns cited transient output',async()=>{
  const r=await call({term:'Puente dental'});
  expect(r.status).toBe(200);expect(r.body.status).toBe('answered');
  expect(r.answer).toHaveBeenCalledExactlyOnceWith('Puente dental');
  expect(r.body.sources[0].url).toBe('https://example.org/dental');expect(r.cache).toBe('no-store');
 });
 it('rejects missing authentication, third-party origins and extra patient fields before querying',async()=>{
  for(const [input,options,status] of [[{term:'Puente dental'},{token:''},401],[{term:'Puente dental'},{user:null},401],[{term:'Puente dental',patient:'private'},undefined,400],[{term:'Puente dental'},{origin:'https://other.example'},403],[{term:'Mi tratamiento'},undefined,400]]){
   const r=await call(input,options);expect(r.status).toBe(status);expect(r.answer).not.toHaveBeenCalled();
  }
 });
 it('does not query a provider after the pilot budget is exhausted',async()=>{
  const r=await call({term:'Puente dental'},{quota:false});expect(r.status).toBe(429);expect(r.answer).not.toHaveBeenCalled();
 });
});
