export async function readAssetBytes(uri:string){
  const response=await fetch(uri);
  if(!response.ok)throw new Error("No se pudo leer el original. Selecciónalo otra vez.");
  return {bytes:new Uint8Array(await response.arrayBuffer()),type:response.headers.get('content-type')??'application/octet-stream'};
}
