import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBravePilot } from './brave.mjs';
import { publicTerm } from './web.mjs';

export function createEducationHandler({ verifyUser, answer, consume }) {
  return async (req,res) => {
    const origin=req.headers.origin;
    if(origin && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin)) {res.writeHead(403);res.end();return;}
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})};
    const send=(status,body)=>{res.writeHead(status,headers);res.end(JSON.stringify(body));};
    if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, GET, OPTIONS'});res.end();return;}
    if(req.url==='/health'&&req.method==='GET'){send(200,{service:'education',mode:'contextual-terms'});return;}
    if(req.url!=='/explain'||req.method!=='POST'){send(404,{status:'unavailable'});return;}
    try {
      const token=/^Bearer (.+)$/.exec(req.headers.authorization??'')?.[1];
      if(!token){send(401,{status:'unavailable'});return;}
      const user=await verifyUser(token);
      if(!user){send(401,{status:'unavailable'});return;}
      let body='';
      for await(const part of req){body+=part.toString();if(Buffer.byteLength(body)>512){send(413,{status:'unavailable'});return;}}
      const input=JSON.parse(body);
      if(!input || Object.keys(input).length!==1) {send(400,{status:'insufficient_evidence'});return;}
      const term=publicTerm(input.term);
      if(!consume(user)){send(429,{status:'unavailable',message:'Se alcanzó el límite de consultas de esta prueba. Puedes volver a consultar los conceptos guardados.'});return;}
      const result=await answer(term);
      send(200,{status:result.status==='candidate'?'answered':result.status,explanation:result.explanation,sources:result.sources,generated:true});
    } catch(error) {
      send(error instanceof SyntaxError || /nombre odontológico|preguntas|pauta|datos personales/.test(error.message)?400:503,{status:'unavailable',message:'No se pudo obtener una explicación con fuentes. Conservamos tu registro sin cambios.'});
    }
  };
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
  for(const file of ['.env','.env.education.local'])if(existsSync(resolve(root,file)))process.loadEnvFile(resolve(root,file));
  const ledgerPath=resolve(root,'.expo/education-usage.json');
  let ledger=existsSync(ledgerPath)?JSON.parse(readFileSync(ledgerPath,'utf8')):{month:'',count:0,users:{}};
  let busy=false;
  const handler=createEducationHandler({
    verifyUser: async token=>{
      if(!process.env.EXPO_PUBLIC_SUPABASE_URL||!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;
      const res=await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/user`,{headers:{apikey:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000),cache:'no-store'});
      return res.ok?(await res.json()).id:null;
    },
    consume:user=>{
      const month=new Date().toISOString().slice(0,7),hour=new Date().toISOString().slice(0,13);
      if(ledger.month!==month)ledger={month,count:0,users:{}};
      const id=createHash('sha256').update(user).digest('hex');
      const usage=ledger.users[id]?.hour===hour?ledger.users[id]:{hour,count:0};
      if(busy||ledger.count>=10||usage.count>=3)return false;
      ledger.count++;usage.count++;ledger.users[id]=usage;
      mkdirSync(dirname(ledgerPath),{recursive:true});
      writeFileSync(ledgerPath+'.tmp',JSON.stringify(ledger));renameSync(ledgerPath+'.tmp',ledgerPath);
      return true;
    },
    answer:async term=>{busy=true;try{return await runBravePilot({term,apiKey:process.env.BRAVE_ANSWERS_API_KEY});}finally{busy=false;}},
  });
  createServer(handler).listen(8130,'127.0.0.1',()=>console.log('Conceptos con fuentes: http://127.0.0.1:8130 · máximo 10 consultas de prueba/mes; sin almacenar respuestas.'));
}
