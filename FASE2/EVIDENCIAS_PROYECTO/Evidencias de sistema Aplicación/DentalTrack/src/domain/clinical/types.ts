export type IngestionStatus =
  | 'not_requested'
  | 'queued'
  | 'processing'
  | 'needs_review'
  | 'accepted'
  | 'rejected'
  | 'failed';

export interface ClinicalSession {
  readonly id: string;
  readonly treatmentId?: string;
  readonly scheduledAt: string;
  readonly status: 'scheduled' | 'completed' | 'cancelled' | 'missed';
}

export interface DentalAppointment {
  readonly id: string;
  readonly scheduledAt: string;
  readonly status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'missed';
  readonly toothIds: readonly string[];
  readonly locationLabel: string | null;
  readonly notes: string | null;
  readonly durationMinutes: number | null;
}

export interface CreateAppointmentInput {
  readonly id: string;
  readonly scheduledAt: string;
  readonly location: string;
  readonly reason: string;
  readonly toothIds: readonly string[];
}

export interface UpdateAppointmentInput extends CreateAppointmentInput {
  readonly status: 'scheduled' | 'cancelled' | 'completed';
}

export interface ClinicalEvent {
  readonly id: string;
  readonly sessionId?: string;
  readonly toothIds: readonly string[];
  readonly type: 'diagnosis' | 'procedure' | 'control' | 'prescription' | 'instruction' | 'document';
  readonly occurredAt: string;
  readonly title: string;
  readonly professionalName?: string | null;
  readonly personalNotes?: string | null;
}

export interface RecordSessionInput {
  readonly id: string;
  /** Local calendar day, YYYY-MM-DD. A timestamp must be converted at the boundary. */
  readonly date: string;
  readonly title: string;
  readonly professional: string;
  readonly notes: string;
  readonly toothIds: readonly string[];
}

export interface ClinicalDocument {
  readonly id: string;
  readonly eventId?: string;
  readonly kind: 'xray' | 'estimate' | 'prescription' | 'report' | 'other';
  readonly ingestionStatus: IngestionStatus;
}

export interface CareTimer {
  readonly id: string;
  readonly eventId?: string;
  readonly label: string;
  readonly startsAt: string;
  readonly dueAt: string;
  readonly status: 'active' | 'completed' | 'cancelled';
}
