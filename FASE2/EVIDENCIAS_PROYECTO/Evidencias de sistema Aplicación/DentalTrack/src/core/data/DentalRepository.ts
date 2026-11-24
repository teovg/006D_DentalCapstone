import type { ClinicalEvent, ClinicalSession, DentalAppointment, RecordSessionInput, CreateAppointmentInput, UpdateAppointmentInput } from '../../domain/clinical/types';
import type { PatientTooth, ToothDetail, ToothStatus } from '../../domain/teeth/types';

export class PatientProfileMissingError extends Error {
  constructor() {
    super('Tu cuenta aún no tiene una ficha dental asociada.');
    this.name = 'PatientProfileMissingError';
  }
}

export interface InitialPatientInput {
  readonly name: string;
  readonly birthDate: string;
}

export interface DentalRepository {
  readonly mode: 'local-demo' | 'supabase';
  listPermanentTeeth(): Promise<readonly PatientTooth[]>;
  getToothDetail(toothId: string): Promise<ToothDetail>;
  updateTooth(
    toothId: string,
    changes: { status: ToothStatus; summary: string },
  ): Promise<PatientTooth>;
  listClinicalEvents(): Promise<readonly ClinicalEvent[]>;
  listSessions(): Promise<readonly ClinicalSession[]>;
  listAppointments(): Promise<readonly DentalAppointment[]>;
  recordSession(input: RecordSessionInput): Promise<void>;
  createAppointment(input: CreateAppointmentInput): Promise<void>;
  updateAppointment(input: UpdateAppointmentInput): Promise<void>;
  createInitialPatient(input: InitialPatientInput): Promise<void>;
}
