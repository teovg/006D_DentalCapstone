import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform==='win32'&&!/^C:[\\/]/i.test(process.execPath))throw new Error('Inicia DentalTrack con Node.js instalado en C:.');
const env={...process.env,EXPO_NO_TELEMETRY:'1',EXPO_OFFLINE:'1'};
if(process.platform==='win32')env.Path=(process.env.Path||process.env.PATH||'').split(';').filter(p=>!/^\s*D:[\\/]/i.test(p)).join(';');
const children=[];
let stopping=false;
let server;
const health=async(port,path='/health')=>fetch(`http://127.0.0.1:${port}${path}`,{signal:AbortSignal.timeout(2000)}).then(r=>r.ok).catch(()=>false);
function stop(){stopping=true;for(const child of children)if(child.exitCode===null)child.kill();server?.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
function service(script,label){
 const child=spawn(process.execPath,[resolve(root,script)],{cwd:root,env,stdio:'inherit',windowsHide:true});children.push(child);
 child.on('error',error=>console.error(`${label}: ${error.message}`));
 child.on('exit',()=>{if(!stopping){console.error(`${label} se detuvo. Se reintentará en 5 segundos.`);setTimeout(()=>{if(!stopping)service(script,label);},5000);}});
}
for(const [port,script,label] of [[8124,'services/ocr/server.mjs','Lector OCR'],[8130,'services/education/server.mjs','Conceptos']])if(!await health(port))service(script,label);
if(existsSync(resolve(root,'.expo/design-review/manifest.json')) && !await health(24458))service('services/design-review/server.mjs','Revisión de diseño');
if(await health(8115,'/')){
 console.log('La aplicación ya está activa: http://127.0.0.1:8115/ . No se abrió otra instancia.');
}else{
 const output=resolve(root,'.expo',`web-${Date.now()}`);await mkdir(output,{recursive:true});
 console.log('Preparando la aplicación con tu configuración .env...');
 const build=spawn(process.execPath,[resolve(root,'node_modules/expo/bin/cli'),'export','--platform','web','--output-dir',output],{cwd:root,env,stdio:'inherit',windowsHide:true});children.push(build);
 const code=await new Promise((done,reject)=>{build.on('error',reject);build.on('exit',done);});
 if(code!==0){stop();process.exitCode=code??1;}else{
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf'};
  server=createServer(async(req,res)=>{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   try{
    const url=new URL(req.url,'http://127.0.0.1:8115');
    const path=resolve(output,`.${decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)}`);
    if(!path.startsWith(output+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
   }catch{res.writeHead(404);res.end('Archivo no encontrado');}
  });
  server.listen(8115,'127.0.0.1',()=>console.log('DentalTrack: http://127.0.0.1:8115/ · Ctrl+C para cerrar esta ejecución.'));
 }
}
