import { describe, expect, it } from "vitest";
import { newPatient } from "./model";
import { timerAt, timerDuration, groupedSchedule, unscheduledMedicines, medicineReminder, isManualMedicine } from "./timeNoticeRules";

describe("avisos preparados", () => {
  it("calcula el temporizador como duración sin depender del día del calendario", () => {
    expect(timerAt("20", Date.parse("2026-11-16T23:50:00Z"))).toBe(
      "2026-11-17T00:10:00.000Z",
    );
    for (const value of ["", "0", "-1", "abc", "Infinity", "10081"])
      expect(() => timerAt(value, 0)).toThrow();
  });
  it("sugiere solo medicamentos sin horario, aislados por receta e identidad", () => {
    const patient = newPatient("test", "Sintético");
    patient.prescriptions = ["rx1", "rx2"].map((id) => ({
      id,
      title: "Receta",
      date: "2026-11-16",
      image: "",
      medicines: [{ id: "med", name: "Ejemplo", instruction: "Literal" }],
    }));
    patient.reminders = [
      {
        id: "r",
        title: "Horario",
        at: "2026-11-16T12:00:00Z",
        sourceId: "rx1",
        destination: "draft",
        medicationSchedule: {
          medicineId: "med",
          start: "2026-11-16T12:00:00Z",
          intervalHours: 12,
          days: 1,
        },
      },
    ];
    expect(unscheduledMedicines(patient).map((x) => x.p.id)).toEqual(["rx2"]);
  });
});

describe("duraciones y vista previa compacta",()=>{
 it("acepta horas y minutos sin compensar valores negativos o admitir texto",()=>{
  expect(timerDuration("3","15")).toBe("195");
  expect(timerDuration("","20")).toBe("20");
  for(const [h,m] of [["-1","61"],["a","5"],["1","60"],["0","0"],["169","0"]])expect(()=>timerDuration(h!,m!)).toThrow();
 });
 it("agrupa las horas por día y conserva todas las tomas sin filas repetidas",()=>{
  const groups=groupedSchedule(["2026-11-16T12:00:00Z","2026-11-16T18:00:00Z","2026-11-17T12:00:00Z"]);
  expect(groups).toHaveLength(2);expect(groups[0]!.day).toMatch(/lunes/);expect(groups[0]!.times).toHaveLength(2);expect(groups[1]!.day).toMatch(/martes/);
 });
});

it("recupera el horario de una receta aunque no se llegue desde un recordatorio, sin cruzar recetas",()=>{
 const p=newPatient("p","Sintético");p.prescriptions=["rx1","rx2"].map(id=>({id,title:"Receta",date:"2026-11-16",image:"",medicines:[{id:"m",name:"Ejemplo",instruction:""}]}));
 p.reminders=[{id:"r",sourceId:"rx1",title:"Horario",at:"2026-11-16T10:00:00Z",destination:"draft",medicationSchedule:{medicineId:"m",start:"2026-11-16T10:00:00Z",intervalHours:12,days:2}}];
 expect(medicineReminder(p,"rx1","m")?.id).toBe("r");expect(medicineReminder(p,"rx1")?.id).toBe("r");expect(medicineReminder(p,"rx2","m")).toBeUndefined();
});

it("distingue un medicamento manual de una receta escaneada, con compatibilidad de registros anteriores",()=>{
 const base={id:"rx",title:"Medicamento añadido manualmente",date:"2026-11-16",image:"",medicines:[]};
 expect(isManualMedicine({...base,origin:"manual"})).toBe(true);expect(isManualMedicine(base)).toBe(true);expect(isManualMedicine({...base,origin:"scan"})).toBe(false);expect(isManualMedicine({...base,title:"Receta confirmada"})).toBe(false);
});
