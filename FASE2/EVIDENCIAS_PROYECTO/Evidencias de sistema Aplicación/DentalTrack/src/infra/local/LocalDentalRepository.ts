import type { DentalRepository, InitialPatientInput } from '../../core/data/DentalRepository';
import type { ClinicalEvent, ClinicalSession, DentalAppointment, RecordSessionInput, CreateAppointmentInput, UpdateAppointmentInput } from '../../domain/clinical/types';
import { demoPatientTeeth, permanentTeeth } from '../../domain/teeth/catalog';
import type { PatientTooth, ToothDetail, ToothStatus } from '../../domain/teeth/types';

const sessions: readonly ClinicalSession[] = [
  {
    id: 'demo-session-1',
    treatmentId: 'demo-treatment-1',
    scheduledAt: '2026-09-24T11:00:00-03:00',
    status: 'completed',
  },
];

const events: readonly ClinicalEvent[] = [
  {
    id: 'demo-event-1',
    sessionId: 'demo-session-1',
    toothIds: ['permanent:maxillary:right:6'],
    type: 'control',
    occurredAt: '2026-09-24T11:00:00-03:00',
    title: 'Control dental',
  },
];

const sessionKey = 'dentaltrack.demo.attention.v1.';
const appointmentKey = 'dentaltrack.demo.appointment.v1.';
// Legacy date-only records use noon UTC; ISO records already carry their time.
const sessionTimestamp = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00Z` : date;

export class LocalDentalRepository implements DentalRepository {
  readonly mode = 'local-demo' as const;
  private teeth: PatientTooth[];
  private readonly demoSessions = new Map<string, RecordSessionInput>();
  private readonly demoAppointments = new Map<string, CreateAppointmentInput & { status?: DentalAppointment['status'] }>();

  constructor(private readonly storage?: Storage, private readonly fixtures = false) {
    this.teeth = fixtures ? demoPatientTeeth.map((tooth) => ({ ...tooth }))
      : permanentTeeth.map((tooth) => ({ ...tooth, status: 'healthy', summary: 'Sin hallazgos registrados.' }));
  }

  private budgetItems(toothId: string) {
    const budgets = JSON.parse(this.storage?.getItem('dentaltrack.demo.confirmed-budgets.v1') ?? '[]') as import('../../features/documents/types').BudgetCaptureDraft[];
    return budgets.filter((budget) => budget.status === 'confirmed').flatMap((budget) =>
      (budget.items ?? []).filter((item) => item.toothId === toothId || (!item.toothId && !item.toothCode)).map((item) => ({
        description: item.description, clinic: budget.clinicHint, amountClp: item.amountClp,
      })));
  }

  private listRecordedSessions(): RecordSessionInput[] {
    if (!this.storage) return [...this.demoSessions.values()];
    const records: RecordSessionInput[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (!key?.startsWith(sessionKey)) continue;
      const value = this.storage.getItem(key);
      if (value) records.push(JSON.parse(value) as RecordSessionInput);
    }
    return records;
  }

  async recordSession(input: RecordSessionInput): Promise<void> {
    if (input.toothIds.some((id) => !this.teeth.some((tooth) => tooth.id === id))) {
      throw new Error('La atención contiene una pieza que no está en tu ficha.');
    }
    if (this.storage) {
      const key = `${sessionKey}${input.id}`;
      const value = JSON.stringify(input);
      const previous = this.storage.getItem(key);
      if (previous && previous !== value) throw new Error('La atención ya fue guardada. Revisa el historial.');
      this.storage.setItem(key, value);
    } else {
      this.demoSessions.set(input.id, input);
    }
  }

  async listPermanentTeeth() {
    return this.teeth.map((tooth) => ({ ...tooth, budgetedProcedureCount: this.budgetItems(tooth.id).length }));
  }

  async getToothDetail(toothId: string): Promise<ToothDetail> {
    const tooth = this.teeth.find((item) => item.id === toothId);
    if (!tooth) throw new Error('La pieza solicitada no existe.');
    const recorded = this.listRecordedSessions().filter((item) => item.toothIds.includes(toothId)).map((item) => ({
      id: item.id, title: item.title, date: item.date, type: 'procedure' as const,
      details: item.notes || 'Sin notas personales.', professionalName: item.professional || null,
    })).sort((a, b) => b.date.localeCompare(a.date));

    if (!this.fixtures || toothId !== 'permanent:maxillary:right:6') {
      return {
        tooth,
        currentTreatment: null,
        budgetedProcedures: this.budgetItems(toothId),
        events: recorded,
        documents: [],
        notes: [],
      };
    }

    return {
      tooth,
      currentTreatment: {
        id: 'demo-treatment-1',
        title: 'Tratamiento en curso',
        status: 'active',
        completedSessions: 1,
        totalSessions: 3,
        professionalNames: [],
      },
      events: [
        ...recorded,
        {
          id: 'demo-event-1',
          title: 'Control dental',
          date: '2026-09-24',
          type: 'control',
          details: 'Evento vinculado a esta pieza.',
          professionalName: null,
        },
      ],
      documents: [
        {
          id: 'demo-document-1',
          name: 'Radiografía vinculada (archivo no incluido)',
          kind: 'xray',
          availability: 'metadata_only',
        },
      ],
      notes: [
        {
          id: 'demo-note-1',
          title: 'Indicación registrada',
          body: 'Sigue las indicaciones entregadas por tu profesional.',
        },
      ],
    };
  }

  async updateTooth(
    toothId: string,
    changes: { status: ToothStatus; summary: string },
  ): Promise<PatientTooth> {
    const index = this.teeth.findIndex((item) => item.id === toothId);
    const current = this.teeth[index];
    if (index < 0 || !current) throw new Error('La pieza solicitada no existe.');
    const updated: PatientTooth = {
      ...current,
      status: changes.status,
      summary: changes.summary,
      lastUpdate: new Date().toISOString().slice(0, 10),
    };
    this.teeth = this.teeth.map((item) => (item.id === toothId ? updated : item));
    return updated;
  }

  async listClinicalEvents() {
    const recorded = this.listRecordedSessions().map((item): ClinicalEvent => ({
      id: item.id, sessionId: item.id, title: item.title, type: 'procedure', toothIds: item.toothIds,
      occurredAt: sessionTimestamp(item.date), professionalName: item.professional || null, personalNotes: item.notes || null,
    }));
    return [...(this.fixtures ? events : []), ...recorded].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async listSessions() {
    const recorded = this.listRecordedSessions().map((item): ClinicalSession => ({ id: item.id, scheduledAt: sessionTimestamp(item.date), status: 'completed' }));
    return [...(this.fixtures ? sessions : []), ...recorded].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }

  async listAppointments(): Promise<readonly DentalAppointment[]> {
    const stored = new Map(this.demoAppointments);
    if (this.storage) {
      for (let index = 0; index < this.storage.length; index += 1) {
        const key = this.storage.key(index);
        if (!key?.startsWith(appointmentKey)) continue;
        const value = this.storage.getItem(key);
        if (value) { const item = JSON.parse(value) as CreateAppointmentInput; stored.set(item.id, item); }
      }
    }
    return [...[...stored.values()].map((item): DentalAppointment => ({
        id: item.id, scheduledAt: item.scheduledAt, status: ('status' in item ? item.status : 'scheduled') as DentalAppointment['status'], toothIds: item.toothIds,
      locationLabel: item.location || null, notes: item.reason, durationMinutes: null,
    })),
      ...(this.fixtures ? [{ id: 'demo-appointment-1', scheduledAt: '2026-10-13T10:30:00-03:00', status: 'confirmed' as const,
        toothIds: ['permanent:maxillary:right:6'], locationLabel: 'Clínica de prueba',
        notes: 'Continuación del tratamiento de la pieza 16.', durationMinutes: 45 },
      { id: 'demo-appointment-2', scheduledAt: '2026-10-20T17:00:00-03:00', status: 'scheduled' as const,
        toothIds: ['permanent:maxillary:left:6', 'permanent:mandibular:right:6'], locationLabel: 'Clínica de prueba',
        notes: 'Revisión de las piezas 26 y 46.', durationMinutes: 30 }] : []),
    ];
  }

  async createAppointment(input: CreateAppointmentInput): Promise<void> {
    if (input.toothIds.some((id) => !this.teeth.some((tooth) => tooth.id === id))) throw new Error('Revisa las piezas de la cita.');
    if (this.storage) {
      const key = `${appointmentKey}${input.id}`;
      const previous = this.storage.getItem(key);
      const value = JSON.stringify(input);
      if (previous && previous !== value) throw new Error('La cita ya se guardó. Revisa la agenda.');
      this.storage.setItem(key, value);
    } else {
      this.demoAppointments.set(input.id, input);
    }
  }

  async updateAppointment(input: UpdateAppointmentInput): Promise<void> {
    if (!(await this.listAppointments()).some(a => a.id === input.id)) throw new Error('La cita ya no está disponible.');
    if (input.toothIds.some(id => !this.teeth.some(t => t.id === id))) throw new Error('Revisa las piezas de la cita.');
    if (this.storage) this.storage.setItem(`${appointmentKey}${input.id}`, JSON.stringify(input));
    else this.demoAppointments.set(input.id, input);
  }

  async createInitialPatient(_input: InitialPatientInput) {
    return Promise.resolve();
  }
}
