create extension if not exists pgcrypto;

create type public.dentition_type as enum ('permanent', 'primary');
create type public.dental_arch as enum ('maxillary', 'mandibular');
create type public.dental_side as enum ('right', 'left');
create type public.tooth_status as enum ('healthy', 'observation', 'in_treatment', 'urgent', 'missing');
create type public.treatment_status as enum ('planned', 'active', 'paused', 'completed', 'cancelled');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'missed');
create type public.clinical_event_type as enum ('diagnosis', 'procedure', 'control', 'prescription', 'instruction', 'document');
create type public.document_kind as enum ('xray', 'estimate', 'prescription', 'report', 'other');
create type public.ingestion_status as enum ('not_requested', 'queued', 'processing', 'needs_review', 'accepted', 'rejected', 'failed');
create type public.ingestion_source as enum ('document', 'conversation_text', 'conversation_voice');
create type public.proposal_status as enum ('draft', 'needs_review', 'confirmed', 'rejected');
create type public.timer_status as enum ('active', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Mi historial',
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table public.tooth_catalog (
  canonical_id text primary key,
  dentition public.dentition_type not null,
  arch public.dental_arch not null,
  side public.dental_side not null,
  position_from_midline smallint not null check (position_from_midline between 1 and 8),
  name_es text not null,
  fdi_code text not null unique,
  universal_code text,
  unique (dentition, arch, side, position_from_midline)
);

create table public.patient_teeth (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth_id text not null references public.tooth_catalog(canonical_id),
  status public.tooth_status not null default 'healthy',
  summary text,
  updated_at timestamptz not null default now(),
  unique (patient_id, tooth_id),
  unique (id, patient_id)
);

create table public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  title text not null,
  status public.treatment_status not null default 'planned',
  total_sessions integer check (total_sessions is null or total_sessions > 0),
  started_on date,
  completed_on date,
  created_at timestamptz not null default now(),
  unique (id, patient_id)
);

create table public.treatment_teeth (
  treatment_id uuid not null,
  patient_tooth_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  primary key (treatment_id, patient_tooth_id),
  foreign key (treatment_id, patient_id) references public.treatment_plans(id, patient_id) on delete cascade,
  foreign key (patient_tooth_id, patient_id) references public.patient_teeth(id, patient_id) on delete cascade
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status public.appointment_status not null default 'scheduled',
  location_label text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, patient_id)
);

create table public.appointment_teeth (
  appointment_id uuid not null,
  patient_tooth_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  primary key (appointment_id, patient_tooth_id),
  foreign key (appointment_id, patient_id) references public.appointments(id, patient_id) on delete cascade,
  foreign key (patient_tooth_id, patient_id) references public.patient_teeth(id, patient_id) on delete cascade
);

create table public.clinical_sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid,
  occurred_at timestamptz not null,
  professional_name text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, patient_id),
  foreign key (appointment_id, patient_id) references public.appointments(id, patient_id) on delete set null (appointment_id)
);

create table public.treatment_sessions (
  treatment_id uuid not null,
  session_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  sequence_number integer check (sequence_number is null or sequence_number > 0),
  primary key (treatment_id, session_id),
  foreign key (treatment_id, patient_id) references public.treatment_plans(id, patient_id) on delete cascade,
  foreign key (session_id, patient_id) references public.clinical_sessions(id, patient_id) on delete cascade
);

create table public.clinical_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_id uuid,
  treatment_id uuid,
  event_type public.clinical_event_type not null,
  title text not null,
  details text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, patient_id),
  foreign key (session_id, patient_id) references public.clinical_sessions(id, patient_id) on delete set null (session_id),
  foreign key (treatment_id, patient_id) references public.treatment_plans(id, patient_id) on delete set null (treatment_id)
);

create table public.event_teeth (
  event_id uuid not null,
  patient_tooth_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  primary key (event_id, patient_tooth_id),
  foreign key (event_id, patient_id) references public.clinical_events(id, patient_id) on delete cascade,
  foreign key (patient_tooth_id, patient_id) references public.patient_teeth(id, patient_id) on delete cascade
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_id uuid,
  kind public.document_kind not null,
  display_name text not null,
  storage_bucket text not null default 'dental-documents',
  storage_path text,
  mime_type text,
  ingestion_status public.ingestion_status not null default 'not_requested',
  created_at timestamptz not null default now(),
  unique (patient_id, storage_path),
  unique (id, patient_id),
  foreign key (event_id, patient_id) references public.clinical_events(id, patient_id) on delete set null (event_id)
);

create table public.document_teeth (
  document_id uuid not null,
  patient_tooth_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  primary key (document_id, patient_tooth_id),
  foreign key (document_id, patient_id) references public.documents(id, patient_id) on delete cascade,
  foreign key (patient_tooth_id, patient_id) references public.patient_teeth(id, patient_id) on delete cascade
);

create table public.ingestion_proposals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  document_id uuid,
  source public.ingestion_source not null,
  status public.proposal_status not null default 'draft',
  raw_text text,
  structured_payload jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint confirmed_requires_review check (status <> 'confirmed' or reviewed_at is not null),
  unique (id, patient_id),
  foreign key (document_id, patient_id) references public.documents(id, patient_id) on delete cascade
);

create table public.ingestion_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  proposed_tooth_ids text[] not null default '{}',
  treatment_label text,
  estimated_cost numeric(12, 2) check (estimated_cost is null or estimated_cost >= 0),
  currency_code char(3),
  confidence numeric(4, 3) check (confidence is null or confidence between 0 and 1),
  user_correction jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (proposal_id, patient_id) references public.ingestion_proposals(id, patient_id) on delete cascade
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_id uuid,
  medication_label text not null,
  directions text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (event_id, patient_id) references public.clinical_events(id, patient_id) on delete set null (event_id)
);

create table public.care_instructions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_id uuid,
  title text not null,
  body text not null,
  restriction_until timestamptz,
  created_at timestamptz not null default now(),
  foreign key (event_id, patient_id) references public.clinical_events(id, patient_id) on delete set null (event_id)
);

create table public.care_timers (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  event_id uuid,
  prescription_id uuid references public.prescriptions(id) on delete cascade,
  label text not null,
  starts_at timestamptz not null,
  due_at timestamptz not null,
  status public.timer_status not null default 'active',
  check (due_at > starts_at),
  foreign key (event_id, patient_id) references public.clinical_events(id, patient_id) on delete set null (event_id)
);

create or replace function public.owns_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.patients p
    where p.id = target_patient_id and p.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function public.owns_patient(uuid) from public;
grant execute on function public.owns_patient(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.tooth_catalog enable row level security;
alter table public.patient_teeth enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.treatment_teeth enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_teeth enable row level security;
alter table public.clinical_sessions enable row level security;
alter table public.treatment_sessions enable row level security;
alter table public.clinical_events enable row level security;
alter table public.event_teeth enable row level security;
alter table public.documents enable row level security;
alter table public.document_teeth enable row level security;
alter table public.ingestion_proposals enable row level security;
alter table public.ingestion_proposal_items enable row level security;
alter table public.prescriptions enable row level security;
alter table public.care_instructions enable row level security;
alter table public.care_timers enable row level security;

create policy "profiles_self" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "patients_owner" on public.patients for all to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "catalog_read" on public.tooth_catalog for select to authenticated using (true);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'patient_teeth', 'treatment_plans', 'treatment_teeth', 'appointments', 'appointment_teeth',
    'clinical_sessions', 'treatment_sessions', 'clinical_events', 'event_teeth',
    'documents', 'document_teeth', 'ingestion_proposals', 'ingestion_proposal_items', 'prescriptions', 'care_instructions', 'care_timers'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.owns_patient(patient_id)) with check (public.owns_patient(patient_id))',
      table_name || '_owner', table_name
    );
  end loop;
end $$;

-- Data API: deny by default, then expose only the operations used by the
-- current authenticated odontogram adapter. RLS remains an additional filter.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant usage on schema public to authenticated;
grant select on table
  public.patients,
  public.patient_teeth,
  public.tooth_catalog,
  public.event_teeth,
  public.treatment_teeth,
  public.document_teeth,
  public.clinical_events,
  public.clinical_sessions,
  public.care_instructions,
  public.treatment_plans,
  public.treatment_sessions,
  public.documents
to authenticated;

grant update (status, summary, updated_at)
on public.patient_teeth
to authenticated;

insert into storage.buckets (id, name, public)
values ('dental-documents', 'dental-documents', false)
on conflict (id) do update set public = false;

with positions(position_from_midline, name_es) as (
  values
    (1, 'Incisivo central'), (2, 'Incisivo lateral'), (3, 'Canino'),
    (4, 'Primer premolar'), (5, 'Segundo premolar'), (6, 'Primer molar'),
    (7, 'Segundo molar'), (8, 'Tercer molar')
), locations(arch, side, quadrant) as (
  values
    ('maxillary'::public.dental_arch, 'right'::public.dental_side, 1),
    ('maxillary'::public.dental_arch, 'left'::public.dental_side, 2),
    ('mandibular'::public.dental_arch, 'left'::public.dental_side, 3),
    ('mandibular'::public.dental_arch, 'right'::public.dental_side, 4)
)
insert into public.tooth_catalog (
  canonical_id, dentition, arch, side, position_from_midline, name_es, fdi_code, universal_code
)
select
  format('permanent:%s:%s:%s', locations.arch, locations.side, positions.position_from_midline),
  'permanent'::public.dentition_type,
  locations.arch,
  locations.side,
  positions.position_from_midline,
  positions.name_es,
  format('%s%s', locations.quadrant, positions.position_from_midline),
  case
    when locations.arch = 'maxillary' and locations.side = 'right' then (9 - positions.position_from_midline)::text
    when locations.arch = 'maxillary' and locations.side = 'left' then (8 + positions.position_from_midline)::text
    when locations.arch = 'mandibular' and locations.side = 'left' then (25 - positions.position_from_midline)::text
    else (24 + positions.position_from_midline)::text
  end
from positions cross join locations
on conflict (canonical_id) do update set
  name_es = excluded.name_es,
  fdi_code = excluded.fdi_code,
  universal_code = excluded.universal_code;
