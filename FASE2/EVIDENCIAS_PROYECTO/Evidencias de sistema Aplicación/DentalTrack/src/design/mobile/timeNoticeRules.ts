import type { DesignPatient, DesignPrescription } from "./model";
export function timerAt(minutes: string, now = Date.now()): string {
  const duration = Number(minutes);
  if (
    !minutes.trim() ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 10080 ||
    !Number.isFinite(now)
  )
    throw new Error("Indica una duración entre 1 minuto y 7 días.");
  return new Date(now + duration * 60000).toISOString();
}
export function unscheduledMedicines(patient: DesignPatient) {
  return patient.prescriptions.flatMap((p) =>
    p.medicines
      .filter(
        (m) =>
          !patient.reminders.some(
            (r) =>
              r.enabled !== false &&
              r.sourceId === p.id &&
              r.medicationSchedule?.medicineId === m.id,
          ),
      )
      .map((m) => ({ p, m })),
  );
}
export function groupedSchedule(times: readonly string[]) {
  const groups: { day: string; times: string[] }[] = [];
  for (const at of times) {
    const date = new Date(at);
    const day = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(date);
    const hour = new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    let group = groups.find((g) => g.day === day);
    if (!group) {
      group = { day, times: [] };
      groups.push(group);
    }
    group.times.push(hour);
  }
  return groups;
}

export function timerDuration(hours: string, minutes: string): string {
  const h=Number(hours||0), m=Number(minutes||0);
  if(!Number.isInteger(h)||!Number.isInteger(m)||h<0||m<0||m>59||h*60+m<1||h*60+m>10080)
    throw new Error("Indica horas y minutos válidos, hasta 7 días.");
  return String(h*60+m);
}

export function medicineReminder(patient: DesignPatient, prescriptionId?: string, medicineId?: string) {
  const prescription = patient.prescriptions.find(p=>p.id===prescriptionId);
  const selected = medicineId ?? prescription?.medicines[0]?.id;
  return prescription ? patient.reminders.find(r=>r.sourceId===prescription.id && r.medicationSchedule?.medicineId===selected) : undefined;
}

export function isManualMedicine(prescription: DesignPrescription): boolean {
  return prescription.origin === "manual" || (!prescription.origin && !prescription.image && /medicamento.*manual/i.test(prescription.title));
}
