import { File } from "expo-file-system";
export async function readAssetBytes(uri:string){
  const file=new File(uri);
  return {bytes:await file.bytes(),type:file.type||'application/octet-stream'};
}
