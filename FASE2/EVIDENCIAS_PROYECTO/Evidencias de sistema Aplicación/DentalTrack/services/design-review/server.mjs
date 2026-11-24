import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sketch } from './render.mjs';

const base = dirname(fileURLToPath(import.meta.url));
const data = resolve(base,'../../.expo',process.env.DENTALTRACK_REVIEW_TEST === '1' ? 'design-review-test' : 'design-review');
const port = process.env.DENTALTRACK_REVIEW_TEST === '1' ? 24459 : 24458;
const origin = `http://127.0.0.1:${port}`;
const manifest = JSON.parse(await readFile(resolve(data,'manifest.json'),'utf8'));
let selections = {};
try { selections = JSON.parse(await readFile(resolve(data,'choices.json'),'utf8')); } catch(error) { if(error.code!=='ENOENT')throw error; }
let queue = Promise.resolve();
const send = (res,status,body,type='application/json; charset=utf-8') => {res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'; frame-ancestors 'self'; form-action 'none'; base-uri 'none'"});res.end(typeof body==='string'?body:JSON.stringify(body));};
const files = {'/':'index.html','/ui.js':'ui.js','/ui.css':'ui.css','/sketch.css':'sketch.css'};
createServer(async(req,res)=>{
 try {
  if(req.headers.host!==`127.0.0.1:${port}`)return send(res,403,{error:'Origen no permitido.'});
  const url = new URL(req.url,origin);
  if(req.method==='GET' && url.pathname==='/health')return send(res,200,{status:'ok',views:manifest.views.length});
  if(req.method==='GET' && url.pathname==='/api/manifest')return send(res,200,{...manifest,selections});
  if(req.method==='GET' && url.pathname==='/api/choices')return send(res,200,selections);
  if(req.method==='POST' && url.pathname==='/api/choice'){
   if(req.headers.origin!==origin || !req.headers['content-type']?.startsWith('application/json'))return send(res,403,{error:'Abre la página local para elegir.'});
   let raw=''; for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)return send(res,413,{error:'Comentario demasiado largo.'});}
   let body;try{body=JSON.parse(raw);}catch{return send(res,400,{error:'Selección inválida.'});}
   const view=manifest.views.find(v=>v.id===body.id);
   if(!view || !view.variants.some(v=>v.id===body.variant) || typeof body.note!=='string' || body.note.length>1500)return send(res,400,{error:'Vista, propuesta o comentario inválido.'});
   const choice={variant:body.variant,note:body.note,updatedAt:new Date().toISOString(),status:'elegida_no_integrada'};
   const save=queue.then(async()=>{const next={...selections,[view.id]:choice};await mkdir(data,{recursive:true});await writeFile(resolve(data,'choices.tmp'),JSON.stringify(next,null,2),'utf8');await rename(resolve(data,'choices.tmp'),resolve(data,'choices.json'));selections=next;});
   queue=save.catch(()=>{});await save;
   return send(res,200,{choice});
  }
  if(req.method==='GET' && url.pathname.startsWith('/sketch/')){
   const [, ,id,variantId]=url.pathname.split('/');const view=manifest.views.find(v=>v.id===id);const variant=view?.variants.find(v=>v.id===variantId);
   if(!view || !variant)return send(res,404,{error:'Propuesta no encontrada.'});
   const state=['normal','empty','error','loading','long'].includes(url.searchParams.get('state'))?url.searchParams.get('state'):'normal';
   return send(res,200,sketch(view,variant,state),'text/html; charset=utf-8');
  }
  if(req.method==='GET' && files[url.pathname])return send(res,200,await readFile(resolve(base,files[url.pathname]),'utf8'),url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
  send(res,404,{error:'Ruta no disponible.'});
 }catch(error){console.error('Revisión de diseño:',error.message);send(res,500,{error:'No se pudo guardar. Conserva tu comentario y vuelve a intentarlo.'});}
}).listen(port,'127.0.0.1',()=>console.log(`Revisión de todas las vistas: ${origin}/ · decisiones guardadas en este equipo.`));
