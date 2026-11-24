import { randomUUID } from "expo-crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DesignState } from "./model";
import { readAssetBytes } from "./remoteWorkspaceAsset";
import { clinicalChanges } from "./runtimeModel";

export function validateRemoteState(value: unknown): DesignState {
  const state = value as DesignState;
  if (!state || !Array.isArray(state.patients) || !state.patients.length ||
      !state.patients.some(p => p.id === state.activePatientId) ||
      state.patients.some(p => ![p.budgets,p.prescriptions,p.treatments,p.reminders,p.attachments,p.sessions,p.appointments].every(Array.isArray)))
    throw new Error("El registro de la cuenta no tiene un formato válido. Conservamos la copia local.");
  return state;
}

// Merge missing identities only. Conflicting versions retain the cloud record and the local backup.
export function mergeLocalRecords(cloud: DesignState, local: DesignState | null): DesignState {
  const result = structuredClone(cloud);
  const removed=new Set(cloud.deletedRecordIds??[]);
  for (const patient of local?.patients ?? []) {
    if(removed.has(patient.id))continue;
    const target = result.patients.find(p => p.id === patient.id);
    if (!target) { result.patients.push(structuredClone(patient)); continue; }
    for (const key of ["budgets","prescriptions","treatments","reminders","attachments"] as const) {
      const ids = new Set(target[key].map(item => item.id));
      // Arrays remain of their original entity type; only entries of that same key are merged.
      (target[key] as {id:string}[]).push(...patient[key].filter(item => !ids.has(item.id)&&!removed.has(item.id)));
    }
  }
  return result;
}

export class RemoteWorkspace {
  private revision = 0;
  private deleted = new Set<string>();
  private references = new Map<string,string>();
  constructor(private client: SupabaseClient, private ownerId: string) {}
  async load(): Promise<DesignState | null> {
    const { data,error } = await this.client.from("account_workspaces").select("state,revision").eq("owner_user_id",this.ownerId).maybeSingle();
    if(error) throw new Error("No se pudo cargar el registro sincronizado. Verifica conexión y migración de la base de datos; no se abrirá una copia distinta en silencio.");
    this.revision=data?.revision ?? 0;
    if(!data) return null;
    const state=validateRemoteState(data.state);
    this.deleted=new Set(state.deletedRecordIds??[]);
    return this.assets(state,false);
  }
  private async assets(state: DesignState, upload: boolean): Promise<DesignState> {
    const result=structuredClone(state);
    const transform=async(uri:string):Promise<string>=>{
      if(!uri || uri.startsWith("sample:"))return uri;
      const known=this.references.get(uri);if(upload&&known)return known;
      if(uri.startsWith("storage:")){
        if(upload)return uri;
        const path=uri.slice(8);
        if(!path.startsWith(`${this.ownerId}/`))throw new Error("El original no pertenece a esta cuenta.");
        const {data,error}=await this.client.storage.from("dental-documents").createSignedUrl(path,86400);
        if(error)throw new Error("No se pudo abrir el original privado. Vuelve a cargar el registro.");
        this.references.set(data.signedUrl,uri);return data.signedUrl;
      }
      if(!upload || /^https:\/\//.test(uri))return uri;
      const {bytes,type}=await readAssetBytes(uri);
      if(bytes.byteLength>12*1024*1024)throw new Error("El original supera 12 MB. Recorta o reduce su tamaño.");
      const path=`${this.ownerId}/${randomUUID()}`;
      const {error}=await this.client.storage.from("dental-documents").upload(path,bytes,{contentType:type,upsert:false});
      if(error)throw new Error("No se pudo subir el original privado. Tu borrador se conserva.");
      const ref=`storage:${path}`;this.references.set(uri,ref);return ref;
    };
    for(const p of result.patients){
      if(upload) for(const reminder of p.reminders) delete reminder.nativeStatus;
      for(const b of p.budgets)b.image=await transform(b.image);
      for(const rx of p.prescriptions)rx.image=await transform(rx.image);
      for(const a of p.attachments)a.image=await transform(a.image);
      for(const s of p.sessions)if(s.audioUri)s.audioUri=await transform(s.audioUri);
    }
    return result;
  }
  async save(state:DesignState, previous?:DesignState):Promise<void>{
    const stored=await this.assets(state,true);
    const ids=(s:DesignState)=>s.patients.flatMap(p=>[p.id,...[p.budgets,p.prescriptions,p.treatments,p.reminders,p.attachments].flatMap(items=>items.map(item=>item.id))]);
    const current=new Set(ids(state));
    const removed=previous?ids(previous).filter(id=>!current.has(id)):[];
    stored.deletedRecordIds=[...new Set([...this.deleted,...state.deletedRecordIds??[],...removed])];
    const {data,error}=await this.client.rpc(previous ? "commit_account_workspace" : "save_account_workspace",{p_state:stored,p_revision:this.revision,...(previous ? {p_changes:clinicalChanges(state,previous)} : {})});
    if(error?.code==='40001')throw new Error("Otra ventana cambió tu registro. Tu borrador sigue abierto; recarga después de conservar los cambios para evitar sobrescribirlo.");
    if(error)throw new Error("No se pudo sincronizar tu registro. El borrador sigue abierto; revisa la conexión e inténtalo de nuevo.");
    this.revision=Number(data);
    this.deleted=new Set(stored.deletedRecordIds);
  }
}
