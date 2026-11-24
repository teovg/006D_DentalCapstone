-- Ejecutar como rol de despliegue despues de `supabase db push`.
-- El bloque termina con una excepcion si GRANT o RLS difieren del contrato actual.
do $audit$
declare
  readable_tables text[] := array[
    'patients', 'patient_teeth', 'tooth_catalog', 'event_teeth',
    'treatment_teeth', 'document_teeth', 'clinical_events',
    'clinical_sessions', 'care_instructions', 'treatment_plans',
    'treatment_sessions', 'documents', 'appointments', 'appointment_teeth'
  ];
  rls_tables text[] := array[
    'profiles', 'patients', 'tooth_catalog', 'patient_teeth',
    'treatment_plans', 'treatment_teeth', 'appointments',
    'appointment_teeth', 'clinical_sessions', 'treatment_sessions',
    'clinical_events', 'event_teeth', 'documents', 'document_teeth',
    'ingestion_proposals', 'ingestion_proposal_items', 'prescriptions',
    'care_instructions', 'care_timers'
  ];
  missing_items text;
begin
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ) or exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and grantee = 'anon'
  ) then
    raise exception 'Privilege audit failed: anon has access to public tables';
  end if;

  select string_agg(table_name, ', ' order by table_name)
  into missing_items
  from unnest(readable_tables) as expected(table_name)
  where not has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT');
  if missing_items is not null then
    raise exception 'Privilege audit failed: authenticated lacks SELECT on %', missing_items;
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and (
        privilege_type <> 'SELECT'
        or table_name <> all(readable_tables)
      )
  ) then
    raise exception 'Privilege audit failed: unexpected table-level grant for authenticated';
  end if;

  if exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'REFERENCES')
      and not (
        table_name = 'patient_teeth'
        and privilege_type = 'UPDATE'
        and column_name in ('status', 'summary', 'updated_at')
      )
  ) then
    raise exception 'Privilege audit failed: unexpected column write grant for authenticated';
  end if;

  select string_agg(column_name, ', ' order by column_name)
  into missing_items
  from unnest(array['status', 'summary', 'updated_at']) as expected(column_name)
  where not has_column_privilege(
    'authenticated', 'public.patient_teeth', column_name, 'UPDATE'
  );
  if missing_items is not null then
    raise exception 'Privilege audit failed: missing patient_teeth UPDATE on %', missing_items;
  end if;

  select string_agg(table_name, ', ' order by table_name)
  into missing_items
  from unnest(rls_tables) as expected(table_name)
  where not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity
  );
  if missing_items is not null then
    raise exception 'RLS audit failed: missing or disabled on %', missing_items;
  end if;

  raise notice 'DentalTrack Data API audit passed';
end
$audit$;
