import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
const extensions=/\.(?:ts|tsx|mjs|cjs|js|json|sql|ps1)$/i;
const damaged=[];
async function scan(directory){
 for(const item of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,item.name);
  if(item.isDirectory())await scan(path);
  else if(extensions.test(item.name)&&(await readFile(path)).includes(0))damaged.push(path);
 }
}
for(const dir of ['src','scripts','services','plugins','supabase'])await scan(dir);
if(damaged.length)throw new Error(`Archivos dañados con bytes NUL; no se generará una nueva versión:\n${damaged.join('\n')}`);
console.log('Integridad de fuentes: sin bytes NUL.');
