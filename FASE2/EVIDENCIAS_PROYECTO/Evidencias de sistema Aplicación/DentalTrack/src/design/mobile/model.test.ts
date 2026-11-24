import { describe, it, expect } from "vitest";
import { newPatient, saveReviewedSchedule, medicationPreview } from "./model";

const patient = () => ({
  ...newPatient("patient-a", "Perfil de ejemplo"),
  prescriptions: [
    {
      id: "rx-a",
      title: "Receta de prueba",
      image: "sample:prescription",
      date: "2026-11-15",
      medicines: [
        {
          id: "med-a",
          name: "Medicamento de ejemplo",
          instruction: "Indicación literal de prueba",
        },
      ],
    },
  ],
});
const draft = {
  id: "notice-a",
  prescriptionId: "rx-a",
  medicineId: "med-a",
  start: "2026-11-15T15:00:00Z",
  intervalHours: 12,
  days: 2,
};

describe("horarios revisados en la propuesta móvil", () => {
  it("conserva la pauta original y prepara un borrador de cuatro tomas sin programar una alarma", () => {
    const original = patient();
    const next = saveReviewedSchedule(original, draft);
    const reminder = next.reminders[0]!;
    expect(original.reminders).toHaveLength(0);
    expect(next.prescriptions).toEqual(original.prescriptions);
    expect(reminder.destination).toBe("draft");
    expect(reminder.sourceId).toBe("rx-a");
    const saved = reminder.medicationSchedule!;
    expect(
      medicationPreview(saved.start, saved.intervalHours, saved.days),
    ).toHaveLength(4);
  });
  it("revisar y guardar otra vez actualiza la misma identidad sin duplicarla ni borrar otros avisos", () => {
    const first = saveReviewedSchedule(patient(), draft);
    first.reminders.push({
      id: "personal",
      title: "Aviso personal",
      at: draft.start,
      destination: "draft",
      sourceId: "",
    });
    const next = saveReviewedSchedule(first, {
      ...draft,
      id: "another-operation",
      start: "2026-11-16T15:00:00Z",
    });
    expect(next.reminders).toHaveLength(2);
    expect(next.reminders[0]!.id).toBe("notice-a");
    expect(next.reminders[0]!.medicationSchedule!.start).toBe(
      "2026-11-16T15:00:00Z",
    );
    expect(next.reminders[1]!.id).toBe("personal");
  });
  it("rechaza una receta de otro paciente o un medicamento ajeno", () => {
    expect(() =>
      saveReviewedSchedule(newPatient("patient-b", "Segundo perfil"), draft),
    ).toThrow("no pertenecen");
    expect(() =>
      saveReviewedSchedule(patient(), { ...draft, medicineId: "other" }),
    ).toThrow("no pertenecen");
  });
  it("no guarda horarios inválidos", () => {
    expect(() =>
      saveReviewedSchedule(patient(), { ...draft, intervalHours: 0 }),
    ).toThrow("Revisa");
    expect(() =>
      saveReviewedSchedule(patient(), { ...draft, start: "fecha inválida" }),
    ).toThrow("Revisa");
  });
});
