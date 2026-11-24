begin;
-- A revision conflict or a failed clinical write rolls back the entire confirmed change.
create or replace function public.commit_account_workspace(p_state jsonb, p_revision bigint, p_changes jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare
  patient uuid;
  revision bigint;
  item jsonb;
  teeth text[];
begin
  if (select auth.uid()) is null then raise exception 'account_access_denied' using errcode='42501'; end if;
  if p_changes is null or jsonb_typeof(p_changes) is distinct from 'object'
    or jsonb_typeof(p_changes->'teeth') is distinct from 'array'
    or jsonb_typeof(p_changes->'appointments') is distinct from 'array'
    or jsonb_typeof(p_changes->'sessions') is distinct from 'array'
    or jsonb_array_length(p_changes->'teeth')>32
    or jsonb_array_length(p_changes->'appointments')>1000
    or jsonb_array_length(p_changes->'sessions')>1000 then
    raise exception 'invalid_changes' using errcode='22023';
  end if;
  -- This write locks the revision until all writes below have committed.
  revision := public.save_account_workspace(p_state,p_revision);
  select id into patient from public.patients where owner_user_id=(select auth.uid()) order by created_at limit 1;
  if patient is null then raise exception 'patient_missing' using errcode='P0002'; end if;
  for item in select value from jsonb_array_elements(p_changes->'teeth') loop
    if char_length(coalesce(item->>'note',''))>1500 then raise exception 'invalid_note' using errcode='22023'; end if;
    update public.patient_teeth set status=(item->>'status')::public.tooth_status,
      summary=coalesce(item->>'note',''),updated_at=now()
      where patient_id=patient and tooth_id=item->>'id';
    if not found then raise exception 'invalid_tooth' using errcode='22023'; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_changes->'appointments') loop
    if jsonb_typeof(item->'toothIds') is distinct from 'array' then raise exception 'invalid_appointment_tooth' using errcode='22023'; end if;
    teeth:=array(select jsonb_array_elements_text(item->'toothIds'));
    if (item->>'isNew')::boolean then
      perform public.create_dental_appointment((item->>'id')::uuid,patient,(item->>'at')::timestamptz,
        coalesce(nullif(trim(item->>'place'),''),'Por confirmar'),item->>'title',teeth);
    else
      perform public.update_dental_appointment((item->>'id')::uuid,patient,(item->>'at')::timestamptz,
        coalesce(nullif(trim(item->>'place'),''),'Por confirmar'),item->>'title',teeth,item->>'status');
    end if;
  end loop;
  for item in select value from jsonb_array_elements(p_changes->'sessions') loop
    if jsonb_typeof(item->'toothIds') is distinct from 'array' then raise exception 'invalid_session_tooth' using errcode='22023'; end if;
    teeth:=array(select jsonb_array_elements_text(item->'toothIds'));
    perform public.record_dental_session((item->>'id')::uuid,patient,(item->>'date')::date,
      item->>'title',item->>'professional',item->>'notes',teeth);
    if nullif(item->>'appointmentId','') is not null then
      if not exists(select 1 from public.appointments where id=(item->>'appointmentId')::uuid and patient_id=patient) then raise exception 'appointment_missing' using errcode='P0002'; end if;
      update public.clinical_sessions set appointment_id=(item->>'appointmentId')::uuid where id=(item->>'id')::uuid and patient_id=patient;
    end if;
  end loop;
  return revision;
end; $$;
revoke all on function public.commit_account_workspace(jsonb,bigint,jsonb) from public,anon;
grant execute on function public.commit_account_workspace(jsonb,bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
