import { describe,it,expect,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDesignState } from "./model";
import { mergeLocalRecords,RemoteWorkspace,validateRemoteState } from "./remoteWorkspace";
import { readAssetBytes } from './remoteWorkspaceAsset';
vi.mock('expo-crypto',()=>({randomUUID:()=>"asset-test"}));
vi.mock('./remoteWorkspaceAsset',()=>({readAssetBytes:vi.fn()}));
describe('account workspace',()=>{
 it('merges absent identities without replacing cloud edits or duplicating records',()=>{
  const cloud=createDesignState(false),local=structuredClone(cloud);
  cloud.patients[0]!.reminders=[{id:'same',title:'Cloud',at:'2026-11-17T12:00:00Z',sourceId:'',destination:'draft'}];
  local.patients[0]!.reminders=[{...cloud.patients[0]!.reminders[0]!,title:'Local'},{...cloud.patients[0]!.reminders[0]!,id:'extra'}];
  const merged=mergeLocalRecords(cloud,local);
  expect(merged.patients[0]!.reminders.map(r=>r.title)).toEqual(['Cloud','Cloud']);
  expect(mergeLocalRecords(merged,local).patients[0]!.reminders).toHaveLength(2);
  expect(local.patients[0]!.reminders[0]!.title).toBe('Local');
 });
 it('rejects malformed persisted records instead of resetting them',()=>{
  expect(()=>validateRemoteState({patients:[]})).toThrow();
  expect(()=>validateRemoteState({})).toThrow();
 });
 it('does not resurrect a deleted record when another browser still has an old local cache',()=>{
  const cloud=createDesignState(false),local=structuredClone(cloud);
  cloud.deletedRecordIds=['deleted'];
  local.patients[0]!.reminders=[{id:'deleted',title:'Cuidado',at:'',sourceId:'',destination:'draft'}];
  expect(mergeLocalRecords(cloud,local).patients[0]!.reminders).toEqual([]);
 });
 it('propagates revision conflicts and does not report local success',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:null,error:{code:'40001'}});
  const repo=new RemoteWorkspace({rpc} as unknown as SupabaseClient,'owner');
  await expect(repo.save(createDesignState(false))).rejects.toThrow('Otra ventana');
  expect(rpc).toHaveBeenCalledWith('save_account_workspace',expect.objectContaining({p_revision:0}));
 });
 it('commits clinical changes and the workspace in one remote operation without syncing device delivery',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:1,error:null});
  const previous=createDesignState(false),next=structuredClone(previous);
  next.patients[0]!.toothStates['permanent:maxillary:right:6']={status:'observation',note:'Nota sintética'};
  next.patients[0]!.reminders=[{id:'reminder',title:'Cuidado',at:'',sourceId:'',destination:'draft',kind:'care',nativeStatus:'scheduled'}];
  await new RemoteWorkspace({rpc} as unknown as SupabaseClient,'owner').save(next,previous);
  expect(rpc).toHaveBeenCalledOnce();
  expect(rpc).toHaveBeenCalledWith('commit_account_workspace',expect.objectContaining({p_changes:expect.objectContaining({teeth:[{id:'permanent:maxillary:right:6',status:'observation',note:'Nota sintética'}]})}));
  expect(rpc.mock.calls[0]![1].p_state.patients[0].reminders[0]).not.toHaveProperty('nativeStatus');
  expect(next.patients[0]!.reminders[0]!.nativeStatus).toBe('scheduled');
 });
 it('preserves the original draft and avoids committing when uploading its private original fails',async()=>{
  vi.mocked(readAssetBytes).mockResolvedValue({bytes:new Uint8Array([1,2]),type:'image/png'});
  const upload=vi.fn().mockResolvedValue({error:{message:'offline'}}),rpc=vi.fn();
  const client={rpc,storage:{from:()=>({upload})}} as unknown as SupabaseClient;
  const state=createDesignState(false);
  state.patients[0]!.attachments=[{id:'a',title:'Original',type:'other',image:'data:image/png;base64,AQI=',date:'2026-11-16'}];
  await expect(new RemoteWorkspace(client,'owner').save(state)).rejects.toThrow('borrador');
  expect(rpc).not.toHaveBeenCalled();expect(state.patients[0]!.attachments[0]!.image).toContain('data:');
 });
});
