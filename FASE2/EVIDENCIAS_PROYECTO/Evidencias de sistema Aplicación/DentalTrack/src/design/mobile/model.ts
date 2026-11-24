// Motor de comparación compartido; no duplica servicios o datos persistidos.
import { medicationPreview, type DesignPatient } from "./workspaceModel";
export * from "./workspaceModel";

export function saveReviewedSchedule(
  patient: DesignPatient,
  draft: {
    id: string;
    prescriptionId: string;
    medicineId: string;
    start: string;
    intervalHours: number;
    days: number;
  },
): DesignPatient {
  const prescription = patient.prescriptions.find(
    (p) => p.id === draft.prescriptionId,
  );
  const medicine = prescription?.medicines.find(
    (m) => m.id === draft.medicineId,
  );
  if (!prescription || !medicine)
    throw new Error("La receta o el medicamento no pertenecen a este perfil.");
  medicationPreview(draft.start, draft.intervalHours, draft.days);
  const existing = patient.reminders.find(
    (r) =>
      r.sourceId === prescription.id &&
      r.medicationSchedule?.medicineId === medicine.id,
  );
  return {
    ...patient,
    reminders: [
      {
        id: existing?.id ?? draft.id,
        title: `${medicine.name} · horarios revisados`,
        at: draft.start,
        destination: "draft",
        sourceId: prescription.id,
        medicationSchedule: {
          medicineId: medicine.id,
          start: draft.start,
          intervalHours: draft.intervalHours,
          days: draft.days,
        },
      },
      ...patient.reminders.filter((r) => r.id !== existing?.id),
    ],
  };
}
