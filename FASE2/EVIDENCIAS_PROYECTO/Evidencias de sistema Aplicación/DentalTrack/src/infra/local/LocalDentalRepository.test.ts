import { describe, expect, it } from 'vitest';

import { LocalDentalRepository } from './LocalDentalRepository';

describe('fuente dental en memoria', () => {
  it('empieza sin tratamientos, eventos ni citas precargados', async () => {
    const repository = new LocalDentalRepository();
    expect((await repository.listPermanentTeeth()).every((tooth) => tooth.status === 'healthy')).toBe(true);
    expect((await repository.getToothDetail('permanent:maxillary:right:6')).currentTreatment).toBeNull();
    expect(await repository.listClinicalEvents()).toEqual([]);
    expect(await repository.listAppointments()).toEqual([]);
  });

  it('relee las prestaciones confirmadas por identidad canónica sin iniciar tratamientos', async () => {
    const storage = { getItem: () => JSON.stringify([{ status: 'confirmed', clinicHint: 'Clínica ficticia', items: [
      { toothId: 'permanent:maxillary:right:6', description: 'Prestación ficticia', amountClp: 1000 },
    ] }]) } as unknown as Storage;
    const repository = new LocalDentalRepository(storage);
    expect((await repository.listPermanentTeeth()).find((tooth) => tooth.fdi === '16')?.budgetedProcedureCount).toBe(1);
    const detail = await repository.getToothDetail('permanent:maxillary:right:6');
    expect(detail.budgetedProcedures?.[0]?.description).toBe('Prestación ficticia');
    expect(detail.currentTreatment).toBeNull();
  });
  it('vincula una prestación general a toda la dentición sin multiplicar el presupuesto', async () => {
    const budget = [{ status: 'confirmed', items: [{ description: 'Prestación general ficticia', amountClp: 1000 }] }];
    const storage = { getItem: () => JSON.stringify(budget) } as unknown as Storage;
    const repository = new LocalDentalRepository(storage);
    expect((await repository.listPermanentTeeth()).every(tooth => tooth.budgetedProcedureCount === 1)).toBe(true);
    expect((await repository.getToothDetail('permanent:maxillary:right:6')).budgetedProcedures).toHaveLength(1);
    expect(budget[0]?.items).toHaveLength(1);
  });
  it('separates scheduled appointments from completed clinical sessions', async () => {
    const repository = new LocalDentalRepository(undefined, true);
    const appointments = await repository.listAppointments();
    const sessions = await repository.listSessions();
    expect(appointments).toHaveLength(2);
    expect(appointments[0]?.status).toBe('confirmed');
    expect(appointments[1]?.toothIds).toHaveLength(2);
    expect(sessions.every((session) => session.status === 'completed')).toBe(true);
  });
  it('obtiene detalle por identidad canonica', async () => {
    const repository = new LocalDentalRepository(undefined, true);
    const detail = await repository.getToothDetail('permanent:maxillary:right:6');

    expect(detail.tooth.fdi).toBe('16');
    expect(detail.currentTreatment?.completedSessions).toBe(1);
    expect(detail.currentTreatment?.professionalNames).toEqual([]);
    expect(detail.events[0]?.professionalName).toBeNull();
    expect(detail.documents[0]?.availability).toBe('metadata_only');
    expect(detail.notes[0]?.body).toContain('profesional');
  });

  it('devuelve estados vacios honestos para piezas sin actividad', async () => {
    const repository = new LocalDentalRepository(undefined, true);
    const detail = await repository.getToothDetail('permanent:maxillary:left:1');

    expect(detail.currentTreatment).toBeNull();
    expect(detail.events).toEqual([]);
    expect(detail.documents).toEqual([]);
  });

  it('persiste cambios durante la sesion actual', async () => {
    const repository = new LocalDentalRepository(undefined, true);
    const updated = await repository.updateTooth('permanent:maxillary:left:1', {
      status: 'observation',
      summary: 'Observación registrada',
    });

    expect(updated.status).toBe('observation');
    expect((await repository.getToothDetail(updated.id)).tooth.summary).toBe('Observación registrada');
  });
});
