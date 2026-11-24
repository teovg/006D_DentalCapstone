import { describe, expect, it } from "vitest";
import {
  budgetTotal,
  codesFor,
  createDesignState,
  medicationPreview,
  newPatient,
  recordPayment,
  recordSession,
  teethFor,
  toothIdsFromCodes,
  updatePatient,
} from "./model";

describe("recorridos de la propuesta PanelUI", () => {
  it("mantiene un perfil vacío sin marcas clínicas y otro independiente tras confirmar presupuesto", () => {
    let state = createDesignState();
    state = {
      ...state,
      patients: [...state.patients, newPatient("other", "Ejemplo")],
    };
    const budget = createDesignState(true).patients[0]!.budgets[0]!;
    state = updatePatient(state, state.activePatientId, (p) => ({
      ...p,
      budgets: [budget],
    }));
    const tooth = teethFor(state.patients[0]!).find((t) => t.fdi === "16")!;
    expect(tooth.budgetedProcedureCount).toBe(2); // prestación propia y prestación general, sin duplicar el total.
    expect(tooth.status).toBe("healthy");
    expect(tooth.summary).toBe("Sin información clínica registrada.");
    expect(
      teethFor(state.patients[1]!).every((t) => !t.budgetedProcedureCount),
    ).toBe(true);
  });
  it("la numeración es presentación y rechaza piezas ambiguas/inexistentes", () => {
    expect(toothIdsFromCodes("16, 16")).toEqual(
      toothIdsFromCodes("3", "universal"),
    );
    expect(codesFor(toothIdsFromCodes("16"), "universal")).toBe("3");
    expect(() => toothIdsFromCodes("99")).toThrow();
  });
  it("pagar no realiza prestaciones ni modifica el estado dental; no duplica reintentos", () => {
    const original = createDesignState(true).patients[0]!.budgets[0]!;
    const payment = {
      id: "payment-1",
      amount: 10000,
      date: new Date().toISOString(),
      note: "",
      procedureId: "",
    };
    const paid = recordPayment(original, payment);
    expect(recordPayment(paid, payment)).toBe(paid);
    expect(paid.rows.every((r) => !r.done)).toBe(true);
    expect(budgetTotal(paid)).toBe(88000);
    expect(() =>
      recordPayment(paid, { ...payment, id: "other", amount: 100000 }),
    ).toThrow();
    expect(() =>
      recordPayment(paid, { ...payment, id: "other", amount: 0 }),
    ).toThrow();
    expect(() =>
      recordPayment(paid, {
        ...payment,
        id: "other",
        procedureId: "not-in-budget",
      }),
    ).toThrow();
  });
  it("registra una sola atención por cita con profesional propio, sin cambiar piezas", () => {
    const patient = createDesignState(true).patients[0]!;
    const session = {
      id: "session-1",
      title: "Control",
      at: new Date().toISOString(),
      professional: "Profesional de ejemplo",
      toothIds: toothIdsFromCodes("16"),
      treatmentId: "",
      appointmentId: patient.appointments[0]!.id,
      notes: "",
      audioName: "",
    };
    const saved = recordSession(patient, session);
    expect(recordSession(saved, { ...session, id: "retry" })).toBe(saved);
    expect(saved.appointments[0]!.status).toBe("completed");
    expect(saved.toothStates).toEqual({});
    expect(() =>
      recordSession(patient, {
        ...session,
        at: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    ).toThrow();
    expect(() =>
      updatePatient(createDesignState(), "other-account", (p) => p),
    ).toThrow();
  });
  it("previsualiza intervalos exactos, cruza medianoche y excluye el instante final", () => {
    expect(medicationPreview("2026-11-15T23:00:00-03:00", 12, 2)).toEqual([
      "2026-11-16T02:00:00.000Z",
      "2026-11-16T14:00:00.000Z",
      "2026-11-17T02:00:00.000Z",
      "2026-11-17T14:00:00.000Z",
    ]);
    expect(() => medicationPreview("invalid", 12, 2)).toThrow();
    expect(() => medicationPreview(new Date().toISOString(), 0, 2)).toThrow();
  });
});
