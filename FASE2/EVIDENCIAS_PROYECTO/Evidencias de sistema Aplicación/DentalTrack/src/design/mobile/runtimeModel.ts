import type { DentalRepository } from "../../core/data/DentalRepository";
import type {
  ClinicalEvent,
  DentalAppointment,
} from "../../domain/clinical/types";
import type { PatientTooth } from "../../domain/teeth/types";
import { createDesignState, newPatient, type DesignState } from "./model";

const localDay = (value:string) => {
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())) throw new Error('Revisa la fecha de la atención.');
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};

export function clinicalChanges(next: DesignState, previous: DesignState) {
  const patient=next.patients[0]!;
  const before=previous.patients[0]!;
  if(next.activePatientId!==patient.id) return {teeth:[],appointments:[],sessions:[]};
  return {
    teeth: Object.entries(patient.toothStates).filter(([id,value])=>JSON.stringify(value)!==JSON.stringify(before.toothStates[id])).map(([id,value])=>({id,...value})),
    appointments: patient.appointments.filter(a=>JSON.stringify(a)!==JSON.stringify(before.appointments.find(old=>old.id===a.id))).map(a=>({...a,isNew:!before.appointments.some(old=>old.id===a.id)})),
    sessions: patient.sessions.filter(s=>!before.sessions.some(old=>old.id===s.id)).map(s=>({...s,date:localDay(s.at)})),
  };
}

export function hydrateWorkspace(
  saved: DesignState | null,
  teeth: readonly PatientTooth[],
  events: readonly ClinicalEvent[],
  appointments: readonly DentalAppointment[],
  name: string | null,
): DesignState {
  const state = saved ?? createDesignState(false);
  const main = state.patients[0] ?? newPatient("primary", name ?? "Mi perfil");
  const localAppointments = new Map(main.appointments.map((a) => [a.id, a]));
  const localSessions = new Map(main.sessions.map((s) => [s.id, s]));
  return {
    ...state,
    accountName: saved?.accountName ?? name ?? "Mi cuenta",
    patients: [
      {
        ...main,
        name: saved ? main.name : (name ?? "Mi perfil"),
        toothStates: Object.fromEntries(
          teeth
            .filter(
              (t) =>
                t.status !== "healthy" || saved?.patients[0]?.toothStates[t.id],
            )
            .map((t) => [t.id, { status: t.status, note: t.summary }]),
        ),
        appointments: appointments.map((a) => ({
          ...localAppointments.get(a.id),
          id: a.id,
          title: a.notes || "Cita dental",
          at: a.scheduledAt,
          place: a.locationLabel ?? "",
          professional: localAppointments.get(a.id)?.professional ?? "",
          toothIds: [...a.toothIds],
          treatmentId: localAppointments.get(a.id)?.treatmentId ?? "",
          status:
            a.status === "cancelled"
              ? "cancelled"
              : a.status === "completed" ||
                  events.some(
                    (e) =>
                      localSessions.get(e.sessionId ?? e.id)?.appointmentId ===
                      a.id,
                  )
                ? "completed"
                : "scheduled",
        })),
        sessions: events.map((e) => ({
          ...localSessions.get(e.sessionId ?? e.id),
          id: e.sessionId ?? e.id,
          title: e.title,
          at: Number.isFinite(new Date(localSessions.get(e.sessionId ?? e.id)?.at ?? '').getTime()) ? localSessions.get(e.sessionId ?? e.id)!.at : e.occurredAt,
          professional: e.professionalName ?? "",
          toothIds: [...e.toothIds],
          treatmentId:
            localSessions.get(e.sessionId ?? e.id)?.treatmentId ?? "",
          appointmentId:
            localSessions.get(e.sessionId ?? e.id)?.appointmentId ?? "",
          notes:
            localSessions.get(e.sessionId ?? e.id)?.notes ??
            e.personalNotes ??
            "",
          audioName: localSessions.get(e.sessionId ?? e.id)?.audioName ?? "",
        })),
      },
      ...state.patients.slice(1),
    ],
  };
}

// The repository owns remote clinical writes. Unsupported operations must not report remote success.
export async function commitClinicalChanges(
  repository: DentalRepository,
  next: DesignState,
  previous: DesignState,
): Promise<void> {
  const patient = next.patients.find((p) => p.id === next.activePatientId)!;
  const before = previous.patients.find((p) => p.id === patient.id)!;
  if (patient.id !== next.patients[0]?.id) return; // Family records are persisted in the private account workspace.
  for (const [id, value] of Object.entries(patient.toothStates)) {
    if (JSON.stringify(value) !== JSON.stringify(before.toothStates[id]))
      await repository.updateTooth(id, {
        status: value.status,
        summary: value.note,
      });
  }
  for (const a of patient.appointments) {
    const old = before.appointments.find((p) => p.id === a.id);
    const attended =
      old?.status === "scheduled" &&
      a.status === "completed" &&
      patient.sessions.some(
        (s) =>
          s.appointmentId === a.id &&
          !before.sessions.some((previous) => previous.id === s.id),
      );
    if (old && JSON.stringify(old) !== JSON.stringify(a) && !attended)
      await repository.updateAppointment({id:a.id,scheduledAt:a.at,location:a.place,reason:a.title,toothIds:a.toothIds,status:a.status});
    if (!old)
      await repository.createAppointment({
        id: a.id,
        scheduledAt: a.at,
        location: a.place,
        reason: a.title,
        toothIds: a.toothIds,
      });
  }
  for (const s of patient.sessions) {
    if (!before.sessions.some((old) => old.id === s.id))
      await repository.recordSession({
        id: s.id,
        date: localDay(s.at),
        title: s.title,
        professional: s.professional,
        notes: s.notes,
        toothIds: s.toothIds,
      });
  }
}
