let data, current, filtered = [], saving = false;
const drafts = new Map();
let draftStorageError = false;
try{for(const [key,value] of Object.entries(JSON.parse(localStorage.getItem('dentaltrack.design-review.drafts.v1')||'{}')))if(typeof value==='string')drafts.set(key,value);}catch{draftStorageError=true;}
function keepDrafts(){try{localStorage.setItem('dentaltrack.design-review.drafts.v1',JSON.stringify(Object.fromEntries(drafts)));}catch{draftStorageError=true;$('status').textContent='No se pudo conservar el borrador en este navegador. Guarda tu elección antes de cerrar.';}}
const $ = id => document.getElementById(id);
const node = (tag,text,cls) => {const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
function list(){
 const query=$('search').value.toLocaleLowerCase();
 filtered=data.views.filter(v=>(!$('group').value||v.group===$('group').value)&&(!$('pending').checked||!data.selections[v.id])&&`${v.title} ${v.group}`.toLocaleLowerCase().includes(query));
 $('views').replaceChildren();
 for(const view of filtered){const button=node('button',view.title,view.id===current?.id?'current':'');button.type='button';const choice=data.selections[view.id];button.append(node('small',`${view.group} · ${choice?'Elegida '+choice.variant.toUpperCase():'Pendiente'}`));button.onclick=()=>{if(saving)return;show(view);};$('views').append(button);}
 $('progress').textContent=`${Object.keys(data.selections).filter(id=>data.views.some(v=>v.id===id)).length} / ${data.views.length} elegidas · ninguna integración automática`;
}
function show(view){
 current=view;history.replaceState(null,'',`#${encodeURIComponent(view.id)}`);list();
 $('area').textContent=view.group;$('title').textContent=view.title;$('task').textContent=view.task;$('source').textContent=`Código: ${view.source} · Cobertura: ${view.coverage.join(', ')}`;$('states').textContent=`Estados/variantes del flujo: ${view.states.join(' · ')}`;
 const selection=data.selections[view.id];$('note').value=drafts.get(view.id)??selection?.note??'';$('save-note').disabled=!selection;$('status').textContent=draftStorageError?'Este navegador no conserva borradores. Guarda tu elección antes de cerrar.':selection?'Decisión guardada en este equipo. Todavía no integrada.':'Escribe un comentario si quieres; se guarda al elegir A o B. El borrador se conserva en este navegador.';
 $('options').replaceChildren();
 for(const variant of view.variants){const card=node('article',null,'option');card.append(node('h3',`${variant.id.toUpperCase()} · ${variant.name}`),node('p',variant.summary));const iframe=node('iframe',null,'preview');iframe.title=`Boceto ${view.title}, propuesta ${variant.id.toUpperCase()}`;iframe.src=`/sketch/${encodeURIComponent(view.id)}/${variant.id}?state=${$('state').value}`;iframe.setAttribute('sandbox','allow-same-origin');card.append(iframe);const link=node('a','Abrir boceto completo');link.href=iframe.src;link.target='_blank';link.rel='noopener';card.append(link);const choose=node('button',selection?.variant===variant.id?'Elegida · volver a guardar comentario':`Elegir propuesta ${variant.id.toUpperCase()}`,'choose');choose.type='button';choose.onclick=()=>save(variant.id);card.append(choose);$('options').append(card);}
 $('previous').disabled=filtered.indexOf(view)<=0;$('next').disabled=filtered.indexOf(view)>=filtered.length-1;
 $('title').focus({preventScroll:true});
}
async function save(variant){
 if(saving)return;saving=true;$('note').disabled=true;$('status').textContent='Guardando decisión…';
 try{const response=await fetch('/api/choice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:current.id,variant,note:$('note').value})});const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo guardar.');data.selections[current.id]=result.choice;drafts.delete(current.id);keepDrafts();saving=false;show(current);$('status').textContent=`Propuesta ${variant.toUpperCase()} guardada en este equipo. Puedes cambiarla; todavía no está integrada.`;}
 catch(error){saving=false;$('status').textContent=`${error.message} Tu comentario sigue en pantalla.`;}
 finally{$('note').disabled=false;}
}
async function start(){try{const response=await fetch('/api/manifest');if(!response.ok)throw Error('No se pudo cargar el catálogo.');data=await response.json();for(const group of new Set(data.views.map(v=>v.group))){const option=node('option',group);option.value=group;$('group').append(option);}current=data.views.find(v=>v.id===decodeURIComponent(location.hash.slice(1)))||data.views[0];show(current);for(const id of ['search','group','pending'])$(id).addEventListener(id==='search'?'input':'change',list);$('state').onchange=()=>{const note=$('note').value;show(current);$('note').value=note;};$('previous').onclick=()=>{if(!saving)show(filtered[filtered.indexOf(current)-1]||current);};$('next').onclick=()=>{if(!saving)show(filtered[filtered.indexOf(current)+1]||current);};}catch(error){$('status').textContent=error.message;}}
$('note').oninput=()=>{if(current){drafts.set(current.id,$('note').value);keepDrafts();}};
$('save-note').onclick=()=>{const selected=data?.selections[current?.id];if(selected)save(selected.variant);};
start();
