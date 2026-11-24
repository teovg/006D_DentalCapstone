import { permanentTeeth } from "../../domain/teeth/catalog";
import type { PatientTooth, ToothStatus } from "../../domain/teeth/types";

export type DesignTab =
  | "home"
  | "odontogram"
  | "history"
  | "documents"
  | "profile";
export type DesignView =
  | DesignTab
  | "login"
  | "register"
  | "recover"
  | "onboarding"
  | "notifications"
  | "treatments"
  | "treatment"
  | "sessions"
  | "session"
  | "notes"
  | "care"
  | "reminders"
  | "budget"
  | "prescription"
  | "capture"
  | "payments"
  | "budget-progress"
  | "viewer"
  | "account"
  | "patient"
  | "preferences"
  | "privacy"
  | "plan"
  | "family"
  | "schedule";
export interface Location {
  view: DesignView;
  id?: string;
}
export interface Procedure {
  id: string;
  title: string;
  toothIds: string[];
  amount: number;
  general: boolean;
  done: boolean;
  sessionId?: string;
}
export interface DesignBudget {
  id: string;
  title: string;
  clinic: string;
  image: string;
  rows: Procedure[];
  payments: {
    id: string;
    amount: number;
    date: string;
    note: string;
    procedureId: string;
    voidedAt?: string;
  }[];
}
export interface Medicine {
  strength?: string;
  quantity?: string;
  intervalHours?: string;
  days?: string;
  id: string;
  name: string;
  instruction: string;
}
export interface DesignPrescription {
  origin?: 'scan' | 'manual';
  id: string;
  title: string;
  date: string;
  image: string;
  medicines: Medicine[];
}
export interface DesignAppointment {
  id: string;
  title: string;
  at: string;
  place: string;
  professional: string;
  toothIds: string[];
  treatmentId: string;
  status: "scheduled" | "cancelled" | "completed";
}
export interface DesignSession {
  id: string;
  title: string;
  at: string;
  professional: string;
  toothIds: string[];
  treatmentId: string;
  appointmentId: string;
  notes: string;
  care?: string;
  audioName: string;
  audioUri?: string;
}
export interface DesignTreatment {
  id: string;
  title: string;
  toothIds: string[];
  status: "planned" | "active" | "paused" | "completed";
  procedureId: string;
}
export interface DesignReminder {
  kind?: "timer" | "medicine" | "care";
  enabled?: boolean;
  nativeStatus?: "scheduled" | "denied" | "unsupported" | "error";
  id: string;
  title: string;
  at: string;
  destination: "draft" | "external_review";
  sourceId: string;
  medicationSchedule?: {
    medicineId: string;
    start: string;
    intervalHours: number;
    days: number;
  };
}
export interface DesignPatient {
  id: string;
  name: string;
  birthDate: string;
  toothStates: Record<string, { status: ToothStatus; note: string }>;
  budgets: DesignBudget[];
  prescriptions: DesignPrescription[];
  appointments: DesignAppointment[];
  sessions: DesignSession[];
  treatments: DesignTreatment[];
  reminders: DesignReminder[];
  attachments: {
    id: string;
    title: string;
    type: "xray" | "other";
    image: string;
    date: string;
  }[];
}
export interface DesignState {
  deletedRecordIds?: string[];
  accountName: string;
  notificationsEnabled: boolean;
  activePatientId: string;
  patients: DesignPatient[];
  plan: "free" | "premium";
  numbering: "fdi" | "universal";
  numberingConfirmed?: boolean;
  readNotificationIds?: string[];
}

export const newPatient = (id: string, name: string): DesignPatient => ({
  id,
  name,
  birthDate: "",
  toothStates: {},
  budgets: [],
  prescriptions: [],
  appointments: [],
  sessions: [],
  treatments: [],
  reminders: [],
  attachments: [],
});
export const toothIdsFromCodes = (
  value: string,
  numbering: "fdi" | "universal" = "fdi",
): string[] => {
  const codes = value
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean);
  const identities = codes.map((code) =>
    permanentTeeth.find((t) => t[numbering] === code.replace(/^#/, "")),
  );
  if (identities.some((t) => !t))
    throw new Error(
      `Revisa las piezas ${numbering === "fdi" ? "FDI" : "Universal"} indicadas.`,
    );
  return [...new Set(identities.map((t) => t!.id))];
};
export const codesFor = (
  ids: readonly string[],
  numbering: "fdi" | "universal" = "fdi",
) =>
  ids
    .map((id) => permanentTeeth.find((t) => t.id === id)?.[numbering] ?? "")
    .filter(Boolean)
    .join(", ");
export const clp = (amount: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
export const budgetTotal = (budget: DesignBudget) =>
  budget.rows.reduce((sum, row) => sum + row.amount, 0);
export const paidTotal = (budget: DesignBudget) =>
  budget.payments
    .filter((p) => !p.voidedAt)
    .reduce((sum, p) => sum + p.amount, 0);
export function recordPayment(
  budget: DesignBudget,
  payment: DesignBudget["payments"][number],
): DesignBudget {
  if (budget.payments.some((p) => p.id === payment.id)) return budget;
  if (
    !Number.isSafeInteger(payment.amount) ||
    payment.amount <= 0 ||
    payment.amount > budgetTotal(budget) - paidTotal(budget)
  )
    throw new Error("El abono debe ser mayor que cero y no superar el saldo.");
  if (payment.procedureId) {
    const row = budget.rows.find((r) => r.id === payment.procedureId);
    if (!row) throw new Error("La prestación no pertenece a este presupuesto.");
    const assigned = budget.payments
      .filter((p) => !p.voidedAt && p.procedureId === row.id)
      .reduce((sum, p) => sum + p.amount, 0);
    if (payment.amount > row.amount - assigned)
      throw new Error("El abono supera el saldo de esta prestación.");
  }
  return { ...budget, payments: [...budget.payments, payment] };
}
export function teethFor(patient: DesignPatient): PatientTooth[] {
  return permanentTeeth.map((tooth) => ({
    ...tooth,
    status: patient.toothStates[tooth.id]?.status ?? "healthy",
    summary:
      patient.toothStates[tooth.id]?.note ??
      "Sin información clínica registrada.",
    budgetedProcedureCount: patient.budgets.reduce(
      (count, budget) =>
        count +
        budget.rows.filter(
          (row) => row.general || row.toothIds.includes(tooth.id),
        ).length,
      0,
    ),
  }));
}
export function updatePatient(
  state: DesignState,
  patientId: string,
  update: (patient: DesignPatient) => DesignPatient,
): DesignState {
  if (!state.patients.some((p) => p.id === patientId))
    throw new Error("Este perfil ya no está disponible.");
  return {
    ...state,
    patients: state.patients.map((p) => (p.id === patientId ? update(p) : p)),
  };
}
export function recordSession(
  patient: DesignPatient,
  session: DesignSession,
): DesignPatient {
  if (
    patient.sessions.some(
      (s) =>
        s.id === session.id ||
        (!!session.appointmentId && s.appointmentId === session.appointmentId),
    )
  )
    return patient;
  if (
    session.appointmentId &&
    !patient.appointments.some(
      (a) => a.id === session.appointmentId && a.status === "scheduled",
    )
  )
    throw new Error("La cita no está disponible para registrar una atención.");
  if (new Date(session.at).getTime() > Date.now())
    throw new Error("Una atención realizada no puede tener fecha futura.");
  return {
    ...patient,
    sessions: [session, ...patient.sessions],
    appointments: patient.appointments.map((a) =>
      a.id === session.appointmentId ? { ...a, status: "completed" } : a,
    ),
  };
}
export function medicationPreview(
  start: string,
  everyHours: number,
  days: number,
): string[] {
  const first = new Date(start).getTime();
  if (
    !Number.isFinite(first) ||
    !Number.isFinite(everyHours) ||
    everyHours < 1 ||
    everyHours > 48 ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 30
  )
    throw new Error(
      "Revisa el inicio, el intervalo (1–48 horas) y la duración (1–30 días).",
    );
  const end = first + days * 86_400_000;
  const result: string[] = [];
  for (let at = first; at < end; at += everyHours * 3_600_000)
    result.push(new Date(at).toISOString());
  return result;
}

export function createDesignState(populated = false): DesignState {
  const patient = newPatient("example-main", "Leo");
  if (populated) {
    const toothIds = toothIdsFromCodes("16");
    patient.budgets = [
      {
        id: "sample-budget",
        title: "Plan de tratamiento",
        clinic: "Clínica de ejemplo",
        image: "",
        rows: [
          {
            id: "sample-resin",
            title: "Restauración de resina",
            toothIds,
            amount: 58000,
            general: false,
            done: false,
          },
          {
            id: "sample-fluoride",
            title: "Aplicación de flúor barniz",
            toothIds: [],
            amount: 30000,
            general: true,
            done: false,
          },
        ],
        payments: [],
      },
    ];
    const at = new Date();
    at.setDate(at.getDate() + 2);
    at.setHours(16, 30, 0, 0);
    patient.appointments = [
      {
        id: "sample-appointment",
        title: "Control de evolución",
        at: at.toISOString(),
        place: "Clínica de ejemplo",
        professional: "",
        toothIds,
        treatmentId: "",
        status: "scheduled",
      },
    ];
  }
  return {
    accountName: "Leo",
    notificationsEnabled: true,
    activePatientId: patient.id,
    patients: [patient],
    plan: "free",
    numbering: "fdi",
  };
}

// Cada contrato tiene un destino alcanzable; V36 (exportar PDF) continúa retirado.
export const contractViews: Record<string, DesignView> = {
  V01: "login",
  V02: "register",
  V03: "recover",
  V04: "onboarding",
  V05: "family",
  V06: "home",
  V07: "notifications",
  V08: "home",
  V09: "odontogram",
  V10: "odontogram",
  V11: "odontogram",
  V12: "history",
  V13: "history",
  V14: "history",
  V15: "treatments",
  V16: "treatment",
  V17: "session",
  V18: "notes",
  V19: "care",
  V20: "reminders",
  V21: "sessions",
  V22: "documents",
  V23: "documents",
  V24: "capture",
  V25: "budget",
  V26: "payments",
  V27: "capture",
  V28: "prescription",
  V29: "viewer",
  V30: "profile",
  V31: "patient",
  V32: "preferences",
  V33: "privacy",
  V34: "plan",
  V35: "family",
  V37: "profile",
  V38: "budget-progress",
  V39: "schedule",
};
