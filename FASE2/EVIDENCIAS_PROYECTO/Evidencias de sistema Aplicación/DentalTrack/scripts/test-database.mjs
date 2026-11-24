import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let PGlite;
try { ({PGlite}=require('../.expo/cierre/sql/node_modules/@electric-sql/pglite')); }
catch { throw new Error('Instala el motor de pruebas aislado: npm install --prefix .expo/cierre/sql --no-audit --no-fund @electric-sql/pglite'); }
const db=new PGlite();
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
const primary='permanent:maxillary:right:6';
try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to authenticated,anon;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert on storage.objects to authenticated;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 for(const file of (await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()) {
  // gen_random_uuid is PostgreSQL core. The isolated WASM engine does not ship pgcrypto.
  const sql=(await readFile(`supabase/migrations/${file}`,'utf8')).replace('create extension if not exists pgcrypto;','');
  await db.exec(sql);
 }
 await db.exec(`insert into auth.users(id) values ('${a}'),('${b}');`);
 const role=async id=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);
 await role(a);await db.query("select public.create_initial_patient('Cuenta sintética A','2000-01-01')");
 await role(b);await db.query("select public.create_initial_patient('Cuenta sintética B','2000-01-01')");
 const state={patients:[{id:'primary'}]};
 await role(a);
 let result=await db.query('select public.save_account_workspace($1,0) as revision',[state]);assert.equal(result.rows[0].revision,1);
 await assert.rejects(db.query('select public.save_account_workspace($1,0)',[state]),error=>error.code==='40001');
 await assert.rejects(db.query('select public.save_account_workspace($1,1)',[{patients:[]}]),error=>error.code==='22023');
 await role(b);assert.equal((await db.query('select * from public.account_workspaces')).rows.length,0);
 await assert.rejects(db.query('update public.account_workspaces set revision=2'),error=>error.code==='42501');
 await role(a);
 const appointment={id:'00000000-0000-4000-8000-000000000010',title:'Control sintético',at:new Date(Date.now()+86400000).toISOString(),place:'Consulta sintética',toothIds:[primary],status:'scheduled',isNew:true};
 const changes={teeth:[{id:primary,status:'observation',note:'Nota sintética'}],appointments:[appointment],sessions:[]};
 result=await db.query('select public.commit_account_workspace($1,1,$2) as revision',[state,changes]);assert.equal(result.rows[0].revision,2);
 assert.equal((await db.query('select status from public.patient_teeth where tooth_id=$1',[primary])).rows[0].status,'observation');
 // A failed downstream write must roll back both clinical changes and the revision.
 const failure={...changes,teeth:[{id:primary,status:'urgent',note:'No debe persistir'}],appointments:[{...appointment,id:'00000000-0000-4000-8000-000000000011',toothIds:['unknown-tooth']}]};
 await assert.rejects(db.query('select public.commit_account_workspace($1,2,$2)',[state,failure]));
 assert.equal((await db.query('select revision from public.account_workspaces')).rows[0].revision,2);
 assert.equal((await db.query('select status from public.patient_teeth where tooth_id=$1',[primary])).rows[0].status,'observation');
 await assert.rejects(db.query('select public.commit_account_workspace($1,1,$2)',[state,{...changes,appointments:[]}]),error=>error.code==='40001');
 const edit={...changes,teeth:[],appointments:[{...appointment,isNew:false,status:'cancelled'}]};
 await db.query('select public.commit_account_workspace($1,2,$2)',[state,edit]);
 assert.equal((await db.query('select status from public.appointments')).rows[0].status,'cancelled');
 await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['dental-documents',`${a}/original-test`]);
 await role(b);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['dental-documents',`${a}/forbidden`]),error=>error.code==='42501');
 console.log('SQL: migraciones reproducidas; aislamiento A/B; revisión CAS; rollback atómico; edición/cancelación de cita; originales privados: OK. Base en memoria, sin tocar Supabase real.');
} finally { await db.close(); }
