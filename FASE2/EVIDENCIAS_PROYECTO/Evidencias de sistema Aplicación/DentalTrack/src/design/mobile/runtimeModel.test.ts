import { describe, it, expect, vi } from "vitest";
import { commitClinicalChanges, hydrateWorkspace } from "./runtimeModel";
import {
  createDesignState,
  teethFor,
  budgetTotal,
  paidTotal,
  recordPayment,
} from "./model";
import type { DentalRepository } from "../../core/data/DentalRepository";
import { permanentTeeth } from "../../domain/teeth/catalog";
import { LocalDentalRepository } from '../../infra/local/LocalDentalRepository';
const repo = () =>
  ({
    mode: "supabase",
    updateTooth: vi.fn(),
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    recordSession: vi.fn(),
  }) as unknown as DentalRepository;
describe("workspace integration", () => {
  it('uses the original event time when a cached session timestamp is invalid',()=>{
    const state=createDesignState(false);
    state.patients[0]!.sessions.push({id:'s',title:'Prueba',at:'2026-11-14T18:00:00ZT12:00:00Z',professional:'',toothIds:[],treatmentId:'',appointmentId:'',notes:'',audioName:''});
    const event={id:'s',sessionId:'s',type:'procedure' as const,title:'Prueba',occurredAt:'2026-11-14T18:00:00Z',toothIds:[]};
    expect(hydrateWorkspace(state,[],[event],[],null).patients[0]!.sessions[0]!.at).toBe(event.occurredAt);
  });
  it('round-trips an attended session using the repository calendar-day contract',async()=>{
    const repository=new LocalDentalRepository(),previous=createDesignState(false),next=structuredClone(previous);
    const at=new Date(2026,10,14,23,30).toISOString();
    next.patients[0]!.sessions.push({id:'date-test',title:'Prueba',at,professional:'',toothIds:[],treatmentId:'',appointmentId:'',notes:'',audioName:''});
    const write=vi.spyOn(repository,'recordSession');
    await commitClinicalChanges(repository,next,previous);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({date:'2026-11-14'}));
    const events=await repository.listClinicalEvents();
    expect(Number.isFinite(new Date(events[0]!.occurredAt).getTime())).toBe(true);
    expect(hydrateWorkspace(next,[],events,[],null).patients[0]!.sessions[0]!.at).toBe(at);
  });
  it('reads legacy ISO session dates without appending a second time suffix',async()=>{
    const repository=new LocalDentalRepository();
    await repository.recordSession({id:'legacy-date',date:'2026-11-14T18:00:00Z',title:'Prueba',professional:'',toothIds:[],notes:''});
    expect((await repository.listClinicalEvents())[0]!.occurredAt).toBe('2026-11-14T18:00:00Z');
  });
  it("does not treat inventory creation timestamps as clinical confirmation", () => {
    const t = {
      ...permanentTeeth[0]!,
      status: "healthy" as const,
      summary: "Sin resumen registrado.",
      lastUpdate: "2026-11-15",
    };
    expect(
      hydrateWorkspace(null, [t], [], [], null).patients[0]!.toothStates,
    ).toEqual({});
  });
  it("retains a voided payment without counting it in balance or assignment", () => {
    const b = createDesignState(true).patients[0]!.budgets[0]!;
    b.payments.push({
      id: "old",
      amount: 58000,
      date: new Date().toISOString(),
      note: "",
      procedureId: b.rows[0]!.id,
      voidedAt: new Date().toISOString(),
    });
    const next = recordPayment(b, {
      id: "new",
      amount: 58000,
      date: new Date().toISOString(),
      note: "",
      procedureId: b.rows[0]!.id,
    });
    expect(next.payments).toHaveLength(2);
    expect(paidTotal(next)).toBe(58000);
  });
  it("shows a general procedure on every piece without multiplying its budget", () => {
    const state = createDesignState(true),
      p = state.patients[0]!;
    expect(teethFor(p).every((t) => !!t.budgetedProcedureCount)).toBe(true);
    expect(budgetTotal(p.budgets[0]!)).toBe(88000);
  });
  it("records a confirmed attendance from its appointment without treating it as a reschedule", async () => {
    const previous = createDesignState(true),
      next = structuredClone(previous),
      r = repo();
    const appointment = next.patients[0]!.appointments[0]!;
    appointment.status = "completed";
    next.patients[0]!.sessions.push({
      id: "session",
      title: "Atención",
      at: new Date().toISOString(),
      professional: "",
      toothIds: appointment.toothIds,
      treatmentId: "",
      appointmentId: appointment.id,
      notes: "",
      audioName: "",
    });
    await commitClinicalChanges(r, next, previous);
    expect(r.recordSession).toHaveBeenCalledOnce();
    expect(r.createAppointment).not.toHaveBeenCalled();
  });
  it("starts without invented dental findings or records", () => {
    const s = hydrateWorkspace(null, [], [], [], "Nombre");
    expect(s.patients[0]!.toothStates).toEqual({});
    expect(s.patients[0]!.budgets).toEqual([]);
    expect(s.accountName).toBe("Nombre");
  });
  it("sends canonical multi-tooth appointments before committing UI state", async () => {
    const previous = createDesignState(false),
      next = structuredClone(previous),
      r = repo();
    next.patients[0]!.appointments.push({
      id: "a",
      title: "Control",
      at: "2026-11-17T15:00:00Z",
      place: "Consulta",
      professional: "",
      toothIds: ["permanent:maxillary:right:6", "permanent:maxillary:left:6"],
      treatmentId: "",
      status: "scheduled",
    });
    await commitClinicalChanges(r, next, previous);
    expect(r.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "a",
        toothIds: next.patients[0]!.appointments[0]!.toothIds,
      }),
    );
  });
  it("propagates backend failure without mutating previous state", async () => {
    const previous = createDesignState(false),
      next = structuredClone(previous),
      r = repo();
    next.patients[0]!.toothStates.x = {
      status: "observation",
      note: "Registrado",
    };
    vi.mocked(r.updateTooth).mockRejectedValue(new Error("Sin conexión"));
    await expect(commitClinicalChanges(r, next, previous)).rejects.toThrow(
      "Sin conexión",
    );
    expect(previous.patients[0]!.toothStates).toEqual({});
  });
  it("keeps account records separate from local family edits", async () => {
    const previous = createDesignState(false);
    previous.patients.push({
      ...structuredClone(previous.patients[0]!),
      id: "family",
    });
    previous.activePatientId = "family";
    const next = structuredClone(previous),
      r = repo();
    next.patients[1]!.toothStates.x = { status: "observation", note: "Nota" };
    await commitClinicalChanges(r, next, previous);
    expect(r.updateTooth).not.toHaveBeenCalled();
  });
  it("waits for remote appointment edits instead of only changing the local snapshot", async () => {
    const previous = createDesignState(true),
      next = structuredClone(previous),
      r = repo();
    next.patients[0]!.appointments[0]!.title = "Cambiar";
    await commitClinicalChanges(r,next,previous);
    expect(r.updateAppointment).toHaveBeenCalledWith(expect.objectContaining({reason:'Cambiar',id:next.patients[0]!.appointments[0]!.id}));
    vi.mocked(r.updateAppointment).mockRejectedValue(new Error('Sin conexión'));
    await expect(commitClinicalChanges(r,next,previous)).rejects.toThrow('Sin conexión');
  });
});
