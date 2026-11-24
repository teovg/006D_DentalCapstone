begin;
-- Confirmed supplementary records. Canonical teeth/appointments/events remain in their normalized tables.
create table if not exists public.account_workspaces (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.account_workspaces enable row level security;
drop policy if exists account_workspace_read on public.account_workspaces;
create policy account_workspace_read on public.account_workspaces for select to authenticated
  using (owner_user_id = (select auth.uid()));
revoke all on public.account_workspaces from anon, authenticated;
grant select on public.account_workspaces to authenticated;

create or replace function public.save_account_workspace(p_state jsonb, p_revision bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_revision bigint;
begin
  if (select auth.uid()) is null then raise exception 'account_access_denied' using errcode='42501'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state->'patients') is distinct from 'array'
    or jsonb_array_length(p_state->'patients') < 1 or octet_length(p_state::text) > 10485760
    or p_revision is null or p_revision < 0 then
    raise exception 'invalid_workspace' using errcode='22023';
  end if;
  if p_revision = 0 then
    insert into public.account_workspaces(owner_user_id,state) values ((select auth.uid()),p_state)
      on conflict (owner_user_id) do nothing returning revision into new_revision;
  else
    update public.account_workspaces set state=p_state,revision=revision+1,updated_at=now()
      where owner_user_id=(select auth.uid()) and revision=p_revision returning revision into new_revision;
  end if;
  if new_revision is null then raise exception 'workspace_conflict' using errcode='40001'; end if;
  return new_revision;
end; $$;
revoke all on function public.save_account_workspace(jsonb,bigint) from public,anon;
grant execute on function public.save_account_workspace(jsonb,bigint) to authenticated;

-- Originals are private. URLs are signed only after an authenticated owner read.
drop policy if exists account_document_read on storage.objects;
create policy account_document_read on storage.objects for select to authenticated
  using (bucket_id='dental-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists account_document_insert on storage.objects;
create policy account_document_insert on storage.objects for insert to authenticated
  with check (bucket_id='dental-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.update_dental_appointment(
  p_id uuid,p_patient_id uuid,p_scheduled_at timestamptz,p_location text,p_reason text,p_tooth_ids text[],p_status text
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not coalesce(public.owns_patient(p_patient_id),false) then raise exception 'patient_access_denied' using errcode='42501'; end if;
  if p_id is null or p_scheduled_at is null or not isfinite(p_scheduled_at)
    or char_length(trim(coalesce(p_location,''))) not between 1 and 120
    or char_length(trim(coalesce(p_reason,''))) not between 1 and 180
    or p_status not in ('scheduled','cancelled','completed') or p_status is null
    or p_tooth_ids is null or cardinality(p_tooth_ids)>32 then raise exception 'invalid_appointment' using errcode='22023'; end if;
  if not exists(select 1 from public.appointments where id=p_id and patient_id=p_patient_id) then raise exception 'appointment_missing' using errcode='P0002'; end if;
  if exists(select 1 from unnest(p_tooth_ids) t where not exists(select 1 from public.patient_teeth pt where pt.patient_id=p_patient_id and pt.tooth_id=t)) then raise exception 'invalid_appointment_tooth' using errcode='22023'; end if;
  update public.appointments set scheduled_at=p_scheduled_at,location_label=trim(p_location),notes=trim(p_reason),status=p_status::public.appointment_status where id=p_id and patient_id=p_patient_id;
  delete from public.appointment_teeth where appointment_id=p_id and patient_id=p_patient_id;
  insert into public.appointment_teeth(appointment_id,patient_id,patient_tooth_id)
    select p_id,p_patient_id,id from public.patient_teeth where patient_id=p_patient_id and tooth_id=any(p_tooth_ids);
end; $$;
revoke all on function public.update_dental_appointment(uuid,uuid,timestamptz,text,text,text[],text) from public,anon;
grant execute on function public.update_dental_appointment(uuid,uuid,timestamptz,text,text,text[],text) to authenticated;
notify pgrst, 'reload schema';

commit;
