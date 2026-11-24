-- Seed idempotente de demostracion para Supabase local.
-- No crea usuarios ni credenciales. Si no existe un usuario de Auth, finaliza con NOTICE.
do $$
declare
  demo_user_id uuid;
  demo_patient_id uuid := '10000000-0000-4000-8000-000000000001';
  demo_treatment_id uuid := '20000000-0000-4000-8000-000000000001';
  demo_appointment_id uuid := '30000000-0000-4000-8000-000000000001';
  demo_session_id uuid := '40000000-0000-4000-8000-000000000001';
  demo_event_id uuid := '50000000-0000-4000-8000-000000000001';
  demo_document_id uuid := '60000000-0000-4000-8000-000000000001';
  demo_tooth_id uuid;
begin
  select id into demo_user_id from auth.users order by created_at limit 1;
  if demo_user_id is null then
    raise notice 'DentalTrack seed: crea un usuario local de Auth y vuelve a ejecutar el seed.';
    return;
  end if;

  insert into public.profiles (id, display_name)
  values (demo_user_id, 'Paciente de demostracion')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.patients (id, owner_user_id, label)
  values (demo_patient_id, demo_user_id, 'Historial de demostracion')
  on conflict (id) do update set owner_user_id = excluded.owner_user_id;

  insert into public.patient_teeth (patient_id, tooth_id, status, summary)
  select
    demo_patient_id,
    canonical_id,
    case fdi_code
      when '16' then 'in_treatment'::public.tooth_status
      when '26' then 'observation'::public.tooth_status
      when '46' then 'urgent'::public.tooth_status
      when '18' then 'missing'::public.tooth_status
      else 'healthy'::public.tooth_status
    end,
    'Registro sintetico para la demostracion de Semana 8.'
  from public.tooth_catalog
  where dentition = 'permanent'
  on conflict (patient_id, tooth_id) do update set status = excluded.status, summary = excluded.summary;

  select id into demo_tooth_id from public.patient_teeth
  where patient_id = demo_patient_id and tooth_id = 'permanent:maxillary:right:6';

  insert into public.treatment_plans (id, patient_id, title, status, total_sessions, started_on)
  values (demo_treatment_id, demo_patient_id, 'Tratamiento de demostracion', 'active', 3, date '2026-09-24')
  on conflict (id) do nothing;

  insert into public.treatment_teeth (treatment_id, patient_tooth_id, patient_id)
  values (demo_treatment_id, demo_tooth_id, demo_patient_id)
  on conflict do nothing;

  insert into public.appointments (id, patient_id, scheduled_at, status, notes)
  values (demo_appointment_id, demo_patient_id, timestamptz '2026-10-06 10:30:00-03', 'scheduled', 'Dato sintetico')
  on conflict (id) do nothing;

  insert into public.clinical_sessions (id, patient_id, appointment_id, occurred_at, professional_name, notes)
  values (demo_session_id, demo_patient_id, null, timestamptz '2026-09-24 11:00:00-03', 'Profesional de demostracion', 'Sesion sintetica')
  on conflict (id) do nothing;

  insert into public.treatment_sessions (treatment_id, session_id, patient_id, sequence_number)
  values (demo_treatment_id, demo_session_id, demo_patient_id, 1)
  on conflict do nothing;

  insert into public.clinical_events (id, patient_id, session_id, treatment_id, event_type, title, details, occurred_at)
  values (
    demo_event_id, demo_patient_id, demo_session_id, demo_treatment_id, 'control',
    'Control de demostracion', 'Contenido completamente sintetico.', timestamptz '2026-09-24 11:00:00-03'
  )
  on conflict (id) do nothing;

  insert into public.event_teeth (event_id, patient_tooth_id, patient_id)
  values (demo_event_id, demo_tooth_id, demo_patient_id)
  on conflict do nothing;

  insert into public.appointment_teeth (appointment_id, patient_tooth_id, patient_id)
  values (demo_appointment_id, demo_tooth_id, demo_patient_id)
  on conflict do nothing;

  insert into public.documents (id, patient_id, event_id, kind, display_name, storage_path, ingestion_status)
  values (
    demo_document_id, demo_patient_id, demo_event_id, 'xray',
    'Radiografia de demostracion (archivo no incluido)', null, 'not_requested'
  )
  on conflict (id) do nothing;

  insert into public.document_teeth (document_id, patient_tooth_id, patient_id)
  values (demo_document_id, demo_tooth_id, demo_patient_id)
  on conflict do nothing;

  insert into public.care_instructions (patient_id, event_id, title, body)
  select demo_patient_id, demo_event_id, 'Indicacion de demostracion',
    'Contenido sintetico. No constituye una indicacion clinica real.'
  where not exists (
    select 1 from public.care_instructions
    where patient_id = demo_patient_id and event_id = demo_event_id
  );
end $$;
