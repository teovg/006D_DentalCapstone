create or replace function public.create_dental_appointment(
  p_id uuid, p_patient_id uuid, p_scheduled_at timestamptz,
  p_location text, p_reason text, p_tooth_ids text[]
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  clean_location text := trim(coalesce(p_location, ''));
  clean_reason text := trim(coalesce(p_reason, ''));
begin
  if (select auth.uid()) is null or not coalesce(public.owns_patient(p_patient_id), false) then
    raise exception 'patient_access_denied' using errcode = '42501';
  end if;
  if p_id is null or p_scheduled_at is null or not isfinite(p_scheduled_at)
    or char_length(clean_location) not between 1 and 120 or char_length(clean_reason) not between 1 and 180
    or p_tooth_ids is null or cardinality(p_tooth_ids) > 32 then
    raise exception 'invalid_appointment' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_tooth_ids) requested(tooth_id) where not exists (
    select 1 from public.patient_teeth tooth where tooth.patient_id = p_patient_id and tooth.tooth_id = requested.tooth_id
  )) then raise exception 'invalid_appointment_tooth' using errcode = '22023'; end if;

  insert into public.appointments (id, patient_id, scheduled_at, status, location_label, notes)
  values (p_id, p_patient_id, p_scheduled_at, 'scheduled', clean_location, clean_reason)
  on conflict (id) do nothing;
  if not found then
    if exists (select 1 from public.appointments a where a.id = p_id and a.patient_id = p_patient_id
      and a.scheduled_at = p_scheduled_at and a.location_label = clean_location and a.notes = clean_reason
      and array(select distinct unnest(p_tooth_ids) order by 1) = array(
        select tooth.tooth_id from public.appointment_teeth link
        join public.patient_teeth tooth on tooth.id = link.patient_tooth_id and tooth.patient_id = link.patient_id
        where link.appointment_id = p_id and link.patient_id = p_patient_id order by tooth.tooth_id
      )) then return; end if;
    raise exception 'appointment_already_exists' using errcode = '23505';
  end if;
  if p_scheduled_at <= now() then raise exception 'appointment_must_be_future' using errcode = '22023'; end if;
  insert into public.appointment_teeth (appointment_id, patient_id, patient_tooth_id)
  select p_id, p_patient_id, tooth.id from public.patient_teeth tooth
  where tooth.patient_id = p_patient_id and tooth.tooth_id = any(p_tooth_ids);
end;
$$;
revoke all on function public.create_dental_appointment(uuid, uuid, timestamptz, text, text, text[]) from public, anon;
grant execute on function public.create_dental_appointment(uuid, uuid, timestamptz, text, text, text[]) to authenticated;
