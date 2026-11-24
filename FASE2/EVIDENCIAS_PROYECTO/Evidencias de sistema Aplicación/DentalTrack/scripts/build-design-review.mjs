import { readFile, writeFile } from 'node:fs/promises';
const folder = new URL('../.expo/design-review/', import.meta.url);
const views = (await Promise.all(['main.json','sheets.json','capture-med.json'].map(async name=>JSON.parse(await readFile(new URL(name,folder),'utf8'))))).flat();
const ids = new Set();
const coverage = new Set();
for(const view of views){
 if(!/^[a-z0-9-]+$/.test(view.id) || ids.has(view.id))throw Error(`ID inválido/duplicado: ${view.id}`);
 ids.add(view.id);
 if(view.variants.length!==2 || !view.variants.some(v=>v.id==='a') || !view.variants.some(v=>v.id==='b'))throw Error(`Se requieren A y B en ${view.id}`);
 for(const variant of view.variants){
  if(!variant.sections?.length || !variant.actions?.length || variant.actions.length>2)throw Error(`Contenido/acciones inválidas: ${view.id}/${variant.id}`);
 }
 for(const id of view.coverage ?? [])coverage.add(id);
}
for(let i=1;i<=54;i++)if(!coverage.has(`DT-${String(i).padStart(2,'0')}`))throw Error(`Falta cobertura DT-${i}`);
await writeFile(new URL('manifest.json',folder),JSON.stringify({title:'DentalTrack · revisión total',version:1,world:'Guía personal',coverageCount:54,views},null,2),'utf8');
console.log(`${views.length} superficies, ${views.length*2} bocetos, ${coverage.size} IDs de cobertura.`);
