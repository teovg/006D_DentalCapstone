import type { SupabaseClient } from '@supabase/supabase-js';

import {
  PatientProfileMissingError,
  type DentalRepository,
  type InitialPatientInput,
} from '../../core/data/DentalRepository';
import type { ClinicalEvent, ClinicalSession, DentalAppointment, RecordSessionInput, CreateAppointmentInput, UpdateAppointmentInput } from '../../domain/clinical/types';
import type {
  PatientTooth,
  ToothDetail,
  ToothDocumentSummary,
  ToothEvent,
  ToothNote,
  ToothStatus,
  ToothTreatmentSummary,
} from '../../domain/teeth/types';

interface PatientToothRow {
  id: string;
  status: ToothStatus;
  summary: string | null;
  updated_at: string;
  tooth_catalog: {
    canonical_id: string;
    dentition: 'permanent';
    arch: 'maxillary' | 'mandibular';
    side: 'right' | 'left';
    position_from_midline: number;
    name_es: string;
    fdi_code: string;
    universal_code: string;
  };
}

type SessionProfessional = { clinical_sessions: { professional_name: string | null } | null };

type ToothEventRow = SessionProfessional & {
  id: string;
  title: string;
  details: string | null;
  occurred_at: string;
  event_type: ToothEvent['type'];
};

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (data === null) throw new Error('Supabase no devolvio los datos esperados.');
  return data;
}

export class SupabaseDentalRepository implements DentalRepository {
  readonly mode = 'supabase' as const;
  private patientContext: { userId: string; patientId: string } | null = null;

  constructor(private readonly client: SupabaseClient) {}

  clearPatientCache(): void {
    this.patientContext = null;
  }

  private async getPatientId(): Promise<string> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    const user = requireData(authData.user, authError);
    if (this.patientContext?.userId === user.id) return this.patientContext.patientId;

    this.clearPatientCache();
    const { data, error } = await this.client
      .from('patients')
      .select('id')
      .eq('owner_user_id', user.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data) {
      throw new PatientProfileMissingError();
    }
    const patient = data as { id: string };
    this.patientContext = { userId: user.id, patientId: patient.id };
    return patient.id;
  }

  async listPermanentTeeth(): Promise<readonly PatientTooth[]> {
    const patientId = await this.getPatientId();
    const { data, error } = await this.client
      .from('patient_teeth')
      .select(
        'id,status,summary,updated_at,tooth_catalog!inner(canonical_id,dentition,arch,side,position_from_midline,name_es,fdi_code,universal_code)',
      )
      .eq('patient_id', patientId)
      .eq('tooth_catalog.dentition', 'permanent');
    const rows = requireData(data as unknown as PatientToothRow[] | null, error);
    return rows.map((row) => ({
      id: row.tooth_catalog.canonical_id,
      dentition: row.tooth_catalog.dentition,
      arch: row.tooth_catalog.arch,
      side: row.tooth_catalog.side,
      positionFromMidline: row.tooth_catalog.position_from_midline,
      name: row.tooth_catalog.name_es,
      fdi: row.tooth_catalog.fdi_code,
      universal: row.tooth_catalog.universal_code,
      status: row.status,
      summary: row.summary ?? 'Sin resumen registrado.',
      lastUpdate: row.updated_at.slice(0, 10),
    }));
  }

  async getToothDetail(toothId: string): Promise<ToothDetail> {
    const patientId = await this.getPatientId();
    const teeth = await this.listPermanentTeeth();
    const tooth = teeth.find((item) => item.id === toothId);
    if (!tooth) throw new Error('La pieza solicitada no pertenece al paciente actual.');

    const { data: instanceData, error: instanceError } = await this.client
      .from('patient_teeth')
      .select('id')
      .eq('patient_id', patientId)
      .eq('tooth_id', toothId)
      .single();
    const instance = requireData(instanceData as { id: string } | null, instanceError);

    const [eventLinksResult, treatmentLinksResult, documentLinksResult] = await Promise.all([
      this.client.from('event_teeth').select('event_id').eq('patient_tooth_id', instance.id),
      this.client.from('treatment_teeth').select('treatment_id').eq('patient_tooth_id', instance.id),
      this.client.from('document_teeth').select('document_id').eq('patient_tooth_id', instance.id),
    ]);
    const eventIds = requireData(eventLinksResult.data, eventLinksResult.error).map(
      (row: { event_id: string }) => row.event_id,
    );
    const treatmentIds = requireData(treatmentLinksResult.data, treatmentLinksResult.error).map(
      (row: { treatment_id: string }) => row.treatment_id,
    );
    const documentIds = requireData(documentLinksResult.data, documentLinksResult.error).map(
      (row: { document_id: string }) => row.document_id,
    );

    let events: ToothEvent[] = [];
    let notes: ToothNote[] = [];
    if (eventIds.length > 0) {
      const { data: eventData, error: eventError } = await this.client
        .from('clinical_events')
        .select('id,title,details,occurred_at,event_type,clinical_sessions(professional_name)')
        .in('id', eventIds)
        .order('occurred_at', { ascending: false });
      const eventRows = requireData(eventData as unknown as ToothEventRow[] | null, eventError);
      events = eventRows.map((row) => ({
        id: row.id,
        title: row.title,
        date: row.occurred_at.slice(0, 10),
        type: row.event_type,
        details: row.details ?? 'Sin detalle registrado.',
        professionalName: row.clinical_sessions?.professional_name?.trim() || null,
      }));
      const { data: noteData, error: noteError } = await this.client
        .from('care_instructions')
        .select('id,title,body')
        .in('event_id', eventIds);
      notes = requireData(noteData, noteError) as ToothNote[];
    }

    let currentTreatment: ToothTreatmentSummary | null = null;
    if (treatmentIds.length > 0) {
      const { data: treatmentData, error: treatmentError } = await this.client
        .from('treatment_plans')
        .select('id,title,status,total_sessions')
        .in('id', treatmentIds)
        .in('status', ['planned', 'active', 'paused'])
        .limit(1)
        .maybeSingle();
      if (treatmentError) throw new Error(`Supabase: ${treatmentError.message}`);
      const treatment = treatmentData as {
        id: string;
        title: string;
        status: ToothTreatmentSummary['status'];
        total_sessions: number | null;
      } | null;
      if (treatment) {
        const { data: sessionLinks, count, error: sessionError } = await this.client
          .from('treatment_sessions')
          .select('clinical_sessions(professional_name)', { count: 'exact' })
          .eq('treatment_id', treatment.id)
          .eq('patient_id', patientId);
        const sessions = requireData(sessionLinks as unknown as SessionProfessional[] | null, sessionError);
        const names = sessions
          .map((session) => session.clinical_sessions?.professional_name?.trim())
          .filter((name): name is string => Boolean(name));
        currentTreatment = {
          id: treatment.id,
          title: treatment.title,
          status: treatment.status,
          completedSessions: count ?? sessions.length,
          totalSessions: treatment.total_sessions,
          professionalNames: [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es')),
        };
      }
    }

    let documents: ToothDocumentSummary[] = [];
    if (documentIds.length > 0) {
      const { data: documentData, error: documentError } = await this.client
        .from('documents')
        .select('id,display_name,kind,storage_path')
        .in('id', documentIds);
      documents = requireData(documentData, documentError).map(
        (row: {
          id: string;
          display_name: string;
          kind: ToothDocumentSummary['kind'];
          storage_path: string | null;
        }) => ({
          id: row.id,
          name: row.display_name,
          kind: row.kind,
          availability: row.storage_path ? 'available' : 'metadata_only',
        }),
      );
    }

    return { tooth, currentTreatment, events, documents, notes };
  }

  async updateTooth(
    toothId: string,
    changes: { status: ToothStatus; summary: string },
  ): Promise<PatientTooth> {
    const patientId = await this.getPatientId();
    const { error } = await this.client
      .from('patient_teeth')
      .update({ status: changes.status, summary: changes.summary, updated_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('tooth_id', toothId);
    if (error) throw new Error(`Supabase: ${error.message}`);
    const updated = (await this.listPermanentTeeth()).find((item) => item.id === toothId);
    if (!updated) throw new Error('Supabase actualizo la pieza, pero no pudo volver a leerla.');
    return updated;
  }

  async listClinicalEvents(): Promise<readonly ClinicalEvent[]> {
    const patientId = await this.getPatientId();
    const { data, error } = await this.client
      .from('clinical_events')
      .select('id,session_id,event_type,occurred_at,title,event_teeth(patient_teeth(tooth_id)),clinical_sessions(professional_name,notes)')
      .eq('patient_id', patientId)
      .order('occurred_at', { ascending: false });
    const rows = requireData(data, error) as unknown as {
      id: string;
      session_id: string | null;
      event_type: ClinicalEvent['type'];
      occurred_at: string;
      title: string;
      event_teeth: { patient_teeth: { tooth_id: string } }[];
      clinical_sessions: { professional_name: string | null; notes: string | null } | null;
    }[];
    return rows.map((row) => ({
      id: row.id,
      ...(row.session_id ? { sessionId: row.session_id } : {}),
      toothIds: (row.event_teeth ?? []).map((link) => link.patient_teeth.tooth_id),
      type: row.event_type,
      occurredAt: row.occurred_at,
      title: row.title,
      professionalName: row.clinical_sessions?.professional_name ?? null,
      personalNotes: row.clinical_sessions?.notes ?? null,
    })) as ClinicalEvent[];
  }

  async listSessions(): Promise<readonly ClinicalSession[]> {
    const patientId = await this.getPatientId();
    const { data, error } = await this.client
      .from('clinical_sessions')
      .select('id,occurred_at,treatment_sessions(treatment_id)')
      .eq('patient_id', patientId)
      .order('occurred_at', { ascending: false });
    return requireData(data, error).map((row) => ({
      id: row.id,
      ...(row.treatment_sessions?.[0]?.treatment_id
        ? { treatmentId: row.treatment_sessions[0].treatment_id }
        : {}),
      scheduledAt: row.occurred_at,
      status: 'completed',
    })) as ClinicalSession[];
  }

  async createInitialPatient(input: InitialPatientInput): Promise<void> {
    const { error } = await this.client.rpc('create_initial_patient', {
      patient_name: input.name,
      patient_birth_date: input.birthDate,
    });
    if (error) throw new Error(`Supabase: ${error.message}`);
    this.clearPatientCache();
  }

  async recordSession(input: RecordSessionInput): Promise<void> {
    const patientId = await this.getPatientId();
    const { error } = await this.client.rpc('record_dental_session', {
      p_session_id: input.id, p_patient_id: patientId, p_date: input.date,
      p_title: input.title, p_professional: input.professional, p_notes: input.notes, p_tooth_ids: input.toothIds,
    });
    if (error?.code === 'PGRST202') throw new Error('El guardado de atenciones requiere actualizar la base de datos del proyecto.');
    if (error?.code === '23505') throw new Error('Esta atención ya se guardó. Consulta el historial antes de crear otra.');
    if (error) throw new Error('No se pudo guardar la atención. Revisa la conexión e intenta nuevamente.');
  }

  async createAppointment(input: CreateAppointmentInput): Promise<void> {
    const patientId = await this.getPatientId();
    const { error } = await this.client.rpc('create_dental_appointment', {
      p_id: input.id, p_patient_id: patientId, p_scheduled_at: input.scheduledAt,
      // The current RPC requires a nonempty label; this explicitly represents an unknown place.
      p_location: input.location.trim() || 'Por confirmar', p_reason: input.reason, p_tooth_ids: input.toothIds,
    });
    if (error?.code === 'PGRST202') throw new Error('La creación de citas requiere actualizar la base de datos del proyecto.');
    if (error?.code === '23505') throw new Error('La cita ya se guardó. Revisa la agenda.');
    if (error?.code === '22023' && error.message.includes('appointment_must_be_future')) throw new Error('Elige una fecha y hora futura para la cita.');
    if (error) throw new Error('No se pudo guardar la cita. Conserva los datos e intenta nuevamente.');
  }

  async updateAppointment(input: UpdateAppointmentInput): Promise<void> {
    const patientId = await this.getPatientId();
    const { error } = await this.client.rpc('update_dental_appointment', {
      p_id: input.id, p_patient_id: patientId, p_scheduled_at: input.scheduledAt,
      p_location: input.location.trim() || 'Por confirmar', p_reason: input.reason,
      p_tooth_ids: input.toothIds, p_status: input.status,
    });
    if (error) throw new Error('No se pudo actualizar la cita. Conservamos el borrador para reintentar.');
  }

  async listAppointments(): Promise<readonly DentalAppointment[]> {
    const patientId = await this.getPatientId();
    const { data, error } = await this.client
      .from('appointments')
      .select('id,scheduled_at,status,location_label,notes,duration_minutes,appointment_teeth(patient_teeth(tooth_id))')
      .eq('patient_id', patientId)
      .order('scheduled_at');
    const rows = requireData(data, error) as unknown as {
      id: string;
      scheduled_at: string;
      status: DentalAppointment['status'];
      location_label: string | null;
      notes: string | null;
      duration_minutes: number | null;
      appointment_teeth: { patient_teeth: { tooth_id: string } | null }[] | null;
    }[];
    return rows.map((row) => ({
      id: row.id,
      scheduledAt: row.scheduled_at,
      status: row.status,
      locationLabel: row.location_label,
      notes: row.notes,
      durationMinutes: row.duration_minutes,
      toothIds: (row.appointment_teeth ?? []).flatMap((link) => link.patient_teeth ? [link.patient_teeth.tooth_id] : []),
    }));
  }
}
