create or replace function public.create_initial_patient(
  patient_name text,
  patient_birth_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_patient_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication_required';
  end if;

  if trim(coalesce(patient_name, '')) = '' or char_length(trim(patient_name)) > 80 then
    raise exception 'invalid_patient_name';
  end if;

  if patient_birth_date is null or patient_birth_date > current_date then
    raise exception 'invalid_birth_date';
  end if;

  if exists (
    select 1
    from public.patients
    where owner_user_id = current_user_id
  ) then
    raise exception 'initial_patient_already_exists';
  end if;

  insert into public.patients (owner_user_id, label, birth_date)
  values (current_user_id, trim(patient_name), patient_birth_date)
  returning id into new_patient_id;

  insert into public.patient_teeth (patient_id, tooth_id, status, summary)
  select
    new_patient_id,
    canonical_id,
    'healthy'::public.tooth_status,
    'Sin información clínica registrada.'
  from public.tooth_catalog
  where dentition = 'permanent'::public.dentition_type;

  return new_patient_id;
end;
$$;

revoke all on function public.create_initial_patient(text, date) from public, anon;
grant execute on function public.create_initial_patient(text, date) to authenticated;

comment on function public.create_initial_patient(text, date) is
  'Creates the first patient profile owned by the authenticated account and initializes the permanent odontogram.';
