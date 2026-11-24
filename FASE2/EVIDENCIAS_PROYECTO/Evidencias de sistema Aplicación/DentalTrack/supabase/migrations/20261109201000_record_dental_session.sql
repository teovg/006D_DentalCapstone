create or replace function public.record_dental_session(
  p_session_id uuid,
  p_patient_id uuid,
  p_date date,
  p_title text,
  p_professional text,
  p_notes text,
  p_tooth_ids text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  occurred timestamptz := (p_date + time '12:00') at time zone 'America/Santiago';
  clean_title text := trim(coalesce(p_title, ''));
  clean_professional text := nullif(trim(p_professional), '');
  clean_notes text := nullif(trim(p_notes), '');
begin
  if (select auth.uid()) is null or not coalesce(public.owns_patient(p_patient_id), false) then
    raise exception 'patient_access_denied' using errcode = '42501';
  end if;
  if p_session_id is null or p_date is null or p_date < date '1900-01-01'
    or p_date > (now() at time zone 'America/Santiago')::date
    or char_length(clean_title) not between 1 and 140
    or char_length(clean_professional) > 100 or char_length(clean_notes) > 1500
    or p_tooth_ids is null or cardinality(p_tooth_ids) > 32 then
    raise exception 'invalid_session' using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_tooth_ids) as requested(tooth_id)
    where not exists (
      select 1 from public.patient_teeth as tooth
      where tooth.patient_id = p_patient_id and tooth.tooth_id = requested.tooth_id
    )
  ) then
    raise exception 'invalid_session_tooth' using errcode = '22023';
  end if;

  insert into public.clinical_sessions (id, patient_id, occurred_at, professional_name, notes)
  values (p_session_id, p_patient_id, occurred, clean_professional, clean_notes)
  on conflict (id) do nothing;

  if not found then
    if exists (
      select 1 from public.clinical_sessions s
      join public.clinical_events e on e.id = s.id and e.patient_id = s.patient_id and e.session_id = s.id
      where s.id = p_session_id and s.patient_id = p_patient_id and s.occurred_at = occurred
        and s.professional_name is not distinct from clean_professional and s.notes is not distinct from clean_notes
        and e.title = clean_title and e.event_type = 'procedure'
        and array(select distinct unnest(p_tooth_ids) order by 1) = array(
          select tooth.tooth_id from public.event_teeth link
          join public.patient_teeth tooth on tooth.id = link.patient_tooth_id and tooth.patient_id = link.patient_id
          where link.event_id = p_session_id and link.patient_id = p_patient_id order by tooth.tooth_id
        )
    ) then return; end if;
    raise exception 'session_already_exists' using errcode = '23505';
  end if;

  insert into public.clinical_events (id, patient_id, session_id, event_type, occurred_at, title, details)
  values (p_session_id, p_patient_id, p_session_id, 'procedure', occurred, clean_title, clean_notes);

  insert into public.event_teeth (event_id, patient_id, patient_tooth_id)
  select p_session_id, p_patient_id, tooth.id from public.patient_teeth tooth
  where tooth.patient_id = p_patient_id and tooth.tooth_id = any(p_tooth_ids);
end;
$$;

revoke all on function public.record_dental_session(uuid, uuid, date, text, text, text, text[]) from public, anon;
grant execute on function public.record_dental_session(uuid, uuid, date, text, text, text, text[]) to authenticated;
