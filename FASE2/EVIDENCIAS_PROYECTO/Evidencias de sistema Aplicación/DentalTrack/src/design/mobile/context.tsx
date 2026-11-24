import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import { randomUUID } from "expo-crypto";
import type { DesignState, DesignPatient, DesignView, Location } from "./model";
export interface Sheet {
  kind: "actions" | "appointment" | "session" | "reminder" | "schedule" | "treatment" | "tooth" | "payment" | "source" | "education" | "patient-picker" | "family" | "preview";
  id?: string; sourceId?: string; term?: string;
}
export interface PreviewUI {
  agendaDay: Date; agendaMonth: Date;
  historyTab: "agenda" | "treatments" | "history";
  documentFilter: string; documentSearch: string;
  historySearch?: string; historyGroup?: string; historyYear?: string; historyMonth?: string;
  treatmentGrouping?: string; captureImage?: string;
}
export interface PreviewContextValue {
  state: DesignState; setState: Dispatch<SetStateAction<DesignState>>;
  patient: DesignPatient; production: boolean; accountEmail?: string; notificationScope?: string;
  persistence: 'remote' | 'local';
  signOut?: () => Promise<void>;
  confirmNumbering?: (numbering: "fdi" | "universal") => Promise<void>;
  location: Location; go: (view: DesignView, id?: string) => void; back: () => void;
  reset: (populated: boolean) => void; sheet: Sheet | null; education: string | null;
  open: (sheet: Sheet) => void; close: () => void; closeEducation: () => void;
  edit: (change: (patient: DesignPatient) => DesignPatient, message?: string) => Promise<void>;
  editState: (change: (state: DesignState) => DesignState, message?: string) => Promise<void>;
  dirty: boolean; setDirty: (dirty: boolean) => void; notify: (message: string) => void;
  ui: PreviewUI; setUI: Dispatch<SetStateAction<PreviewUI>>;
  scenario: string; setScenario: Dispatch<SetStateAction<string>>;
}
export const PreviewContext = createContext<PreviewContextValue | null>(null);
export function usePreview(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("La vista debe estar dentro del espacio del paciente.");
  return context;
}
// IDs also reach UUID-backed appointment and attendance endpoints.
export const makeId = (_kind?: string): string => randomUUID();
export const shortDate = (value: string | Date): string => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(typeof value==='string'?new Date(value):value);
export const longDate = (value: string | Date): string => new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(typeof value==='string'?new Date(value):value).replace(/^./, (letter) => letter.toLocaleUpperCase("es-CL"));
export const time = (value: string | Date): string => new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(typeof value==='string'?new Date(value):value);
