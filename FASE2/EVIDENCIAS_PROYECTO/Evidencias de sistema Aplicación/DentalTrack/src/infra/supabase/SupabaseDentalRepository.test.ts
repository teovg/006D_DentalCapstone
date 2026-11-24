import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { SupabaseDentalRepository } from './SupabaseDentalRepository';

function resolvedQuery(result: { data: unknown; error: null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('SupabaseDentalRepository session isolation', () => {
  it('saves an appointment with no known location using the explicit pending label required by the RPC', async () => {
    const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, maybeSingle: async () => ({ data: { id: 'patient-a' }, error: null }) };
    const rpc = vi.fn(async () => ({ error: null }));
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) }, from: () => query, rpc } as unknown as SupabaseClient;
    await new SupabaseDentalRepository(client).createAppointment({ id: 'appointment', scheduledAt: '2026-12-01T15:00:00Z', location: '   ', reason: 'Control', toothIds: [] });
    expect(rpc).toHaveBeenCalledWith('create_dental_appointment', expect.objectContaining({p_location:'Por confirmar',p_patient_id:'patient-a',p_reason:'Control'}));
  });
  it('shows professionals of the selected plan without assigning them to unrelated or unrecorded events', async () => {
    const toothId = 'permanent:maxillary:right:6';
    const professional = (name: string | null) => ({ clinical_sessions: { professional_name: name } });
    const event = (id: string) => ({ id, title: id, details: null, occurred_at: '2026-10-13T12:00:00Z', event_type: 'control' });
    const rows: Record<string, unknown> = {
      patient_teeth: [{ id: 'tooth-a', status: 'in_treatment', summary: '', updated_at: '2026-10-13T12:00:00Z', tooth_catalog: { canonical_id: toothId, dentition: 'permanent', arch: 'maxillary', side: 'right', position_from_midline: 6, name_es: 'Primer molar', fdi_code: '16', universal_code: '3' } }],
      event_teeth: [{ event_id: 'event-a' }, { event_id: 'event-old' }, { event_id: 'event-no-name' }],
      treatment_teeth: [{ treatment_id: 'plan-a' }],
      document_teeth: [],
      clinical_events: [
        { ...event('event-a'), ...professional('Profesional A') },
        { ...event('event-old'), ...professional('Profesional de otra atención') },
        { ...event('event-no-name'), clinical_sessions: null },
      ],
      care_instructions: [],
      treatment_sessions: [professional('Profesional B'), professional('Profesional A'), professional(' Profesional A '), professional('  ')],
    };
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) },
      from(table: string) {
        const result = { data: rows[table], error: null, count: table === 'treatment_sessions' ? 4 : null };
        const query = {
          select: () => query, eq: () => query, order: () => query, limit: () => query, in: () => query,
          single: async () => ({ data: { id: 'tooth-a' }, error: null }),
          maybeSingle: async () => ({ data: table === 'patients' ? { id: 'patient-a' } : { id: 'plan-a', title: 'Plan de prueba', status: 'active', total_sessions: 5 }, error: null }),
          then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    } as unknown as SupabaseClient;

    const detail = await new SupabaseDentalRepository(client).getToothDetail(toothId);

    expect(detail.currentTreatment).toMatchObject({ completedSessions: 4, totalSessions: 5, professionalNames: ['Profesional A', 'Profesional B'] });
    expect(detail.events.map(({ id, professionalName }) => [id, professionalName])).toEqual([
      ['event-a', 'Profesional A'], ['event-old', 'Profesional de otra atención'], ['event-no-name', null],
    ]);
  });

  it('loads appointments with canonical multi-tooth links and patient filtering', async () => {
    const patientQuery = {
      select: vi.fn(() => patientQuery), eq: vi.fn(() => patientQuery), order: vi.fn(() => patientQuery), limit: vi.fn(() => patientQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: 'patient-a' }, error: null })),
    };
    const result = { data: [{ id: 'appointment-a', scheduled_at: '2026-10-13T21:00:00Z', status: 'confirmed', location_label: null, notes: null, duration_minutes: 45, appointment_teeth: [{ patient_teeth: { tooth_id: 'permanent:maxillary:right:6' } }, { patient_teeth: { tooth_id: 'permanent:maxillary:left:6' } }] }], error: null };
    const appointmentQuery = { select: vi.fn(() => appointmentQuery), eq: vi.fn(() => appointmentQuery), order: vi.fn(() => appointmentQuery), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    const client = { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-a' } }, error: null })) }, from: vi.fn((table: string) => table === 'patients' ? patientQuery : appointmentQuery) } as unknown as SupabaseClient;
    const appointments = await new SupabaseDentalRepository(client).listAppointments();
    expect(appointmentQuery.eq).toHaveBeenCalledWith('patient_id', 'patient-a');
    expect(appointments[0]?.toothIds).toEqual(['permanent:maxillary:right:6', 'permanent:maxillary:left:6']);
    expect(appointments[0]?.locationLabel).toBeNull();
    expect(appointments[0]?.status).toBe('confirmed');
  });

  it('surfaces calendar errors instead of substituting demonstration data', async () => {
    const patientQuery = { select: () => patientQuery, eq: () => patientQuery, order: () => patientQuery, limit: () => patientQuery, maybeSingle: async () => ({ data: { id: 'patient-a' }, error: null }) };
    const result = { data: null, error: { message: 'permission denied' } };
    const appointmentQuery = { select: () => appointmentQuery, eq: () => appointmentQuery, order: () => appointmentQuery, then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    const client = { auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) }, from: (table: string) => table === 'patients' ? patientQuery : appointmentQuery } as unknown as SupabaseClient;
    await expect(new SupabaseDentalRepository(client).listAppointments()).rejects.toThrow('permission denied');
  });
  it('does not reuse the patient id after the authenticated user changes', async () => {
    let currentUserId = 'user-a';
    const getUser = vi.fn(async () => ({
      data: { user: { id: currentUserId } },
      error: null,
    }));
    const patientLookups: string[] = [];
    const from = vi.fn((table: string) => {
      if (table === 'patients') {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn((_column: string, userId: string) => {
            patientLookups.push(userId);
            return query;
          }),
          order: vi.fn(() => query),
          limit: vi.fn(() => query),
          maybeSingle: vi.fn(async () => ({
            data: currentUserId === 'user-a' ? { id: 'patient-a' } : null,
            error: null,
          })),
        };
        return query;
      }
      if (table === 'patient_teeth') return resolvedQuery({ data: [], error: null });
      throw new Error(`Unexpected table: ${table}`);
    });
    const client = { auth: { getUser }, from } as unknown as SupabaseClient;
    const repository = new SupabaseDentalRepository(client);

    await expect(repository.listPermanentTeeth()).resolves.toEqual([]);

    currentUserId = 'user-b';

    await expect(repository.listPermanentTeeth()).rejects.toThrow(
      'Tu cuenta aún no tiene una ficha dental asociada.',
    );
    expect(patientLookups).toEqual(['user-a', 'user-b']);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('creates the initial patient through the authenticated RPC contract', async () => {
    const rpc = vi.fn(async () => ({ data: 'patient-new', error: null }));
    const client = { rpc } as unknown as SupabaseClient;
    const repository = new SupabaseDentalRepository(client);

    await expect(repository.createInitialPatient({
      name: 'Paciente Demo',
      birthDate: '2000-01-15',
    })).resolves.toBeUndefined();

    expect(rpc).toHaveBeenCalledWith('create_initial_patient', {
      patient_name: 'Paciente Demo',
      patient_birth_date: '2000-01-15',
    });
  });
});
