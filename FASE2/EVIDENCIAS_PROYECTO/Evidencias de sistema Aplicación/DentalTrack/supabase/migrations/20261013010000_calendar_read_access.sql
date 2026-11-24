-- Calendar is read-only in this increment. Existing owner policies remain active.
grant select on table public.appointments, public.appointment_teeth to authenticated;

comment on table public.appointments is
  'Scheduled appointments, separate from performed clinical sessions. Client reads remain protected by patient ownership RLS.';
