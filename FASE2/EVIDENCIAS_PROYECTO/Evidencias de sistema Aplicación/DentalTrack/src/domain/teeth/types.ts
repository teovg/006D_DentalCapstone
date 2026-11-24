export type Dentition = 'permanent';
export type DentalArch = 'maxillary' | 'mandibular';
export type DentalSide = 'right' | 'left';

export type ToothStatus =
  | 'healthy'
  | 'observation'
  | 'in_treatment'
  | 'urgent'
  | 'missing';

export interface ToothIdentity {
  readonly id: string;
  readonly dentition: Dentition;
  readonly arch: DentalArch;
  readonly side: DentalSide;
  readonly positionFromMidline: number;
  readonly name: string;
  readonly fdi: string;
  readonly universal: string;
}

export interface PatientTooth extends ToothIdentity {
  readonly budgetedProcedureCount?: number;
  readonly status: ToothStatus;
  readonly summary: string;
  readonly lastUpdate?: string;
}

export interface ToothEvent {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly type: 'diagnosis' | 'procedure' | 'control' | 'note';
  readonly details: string;
  readonly professionalName: string | null;
}

export interface ToothTreatmentSummary {
  readonly id: string;
  readonly title: string;
  readonly status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
  readonly completedSessions: number;
  readonly totalSessions: number | null;
  readonly professionalNames: readonly string[];
}

export interface ToothDocumentSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: 'xray' | 'estimate' | 'prescription' | 'report' | 'other';
  readonly availability: 'metadata_only' | 'available';
}

export interface ToothNote {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface ToothDetail {
  readonly budgetedProcedures?: readonly { description: string; clinic: string; amountClp: number }[];
  readonly tooth: PatientTooth;
  readonly currentTreatment: ToothTreatmentSummary | null;
  readonly events: readonly ToothEvent[];
  readonly documents: readonly ToothDocumentSummary[];
  readonly notes: readonly ToothNote[];
}
