/// <reference types="uniwind/types" />
import "./global.css";
import { useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Platform, View, useWindowDimensions } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  restoreReminders,
  clearDeviceReminders,
} from "../../features/reminders/deviceReminders";
import { StatusBar } from "expo-status-bar";
import { AnimatedPressable } from "panelui-native/primitives/animated-pressable";
import { Button, NamedSelect, PIcon, useInk } from "./components";
import { Dialog } from "panelui-native/components/dialog";
import { Badge } from "panelui-native/components/badge";
import { PanelUIProvider } from "panelui-native/provider";
import { Text } from "panelui-native/primitives/text";
import { Toast } from "panelui-native/components/toast";
import { useThemeMode } from "panelui-native/theme";
import {
  PreviewContext,
  type PreviewContextValue,
  type PreviewUI,
  type Sheet,
} from "./context";
import {
  createDesignState,
  updatePatient,
  type DesignState,
  type DesignTab,
  type Location,
} from "./model";
import { PreviewScreens } from "./screens";
import { isHomeGuideRequested } from "./homeGuideRequested";
import { guideColors } from "./HomeGuide";
import { PreviewSheets } from "./sheets";
import { AppBackground } from "./ModalBackground";
import { useModalKeyboard } from "./useModalKeyboard";
export interface MobileRuntime {
  initialState: DesignState;
  accountEmail?: string;
  persistence?: "remote" | "local";
  notificationScope?: string;
  commit: (next: DesignState, previous: DesignState) => Promise<DesignState>;
  savePreferences: (state: DesignState) => void;
  signOut?: () => Promise<void>;
  confirmNumbering?: (numbering: "fdi" | "universal") => Promise<void>;
}
const readParam = (key: string) =>
  Platform.OS === "web"
    ? new URLSearchParams(globalThis.location.search).get(key)
    : null;
const initialView = (): DesignTab | "login" => {
  const view = readParam("view");
  return view &&
    ["home", "odontogram", "history", "documents", "profile", "login"].includes(
      view,
    )
    ? (view as DesignTab | "login")
    : "home";
};
export function MobilePreview({ runtime }: { runtime?: MobileRuntime } = {}) {
  return (
    <SafeAreaProvider>
      <PreviewApp {...(runtime ? { runtime } : {})} />
    </SafeAreaProvider>
  );
}
function PreviewApp({ runtime }: { runtime?: MobileRuntime }) {
  useModalKeyboard();
  const { width, height } = useWindowDimensions();
  const c = useInk();
  const insets = useSafeAreaInsets();
  const { setMode } = useThemeMode();
  const initialThemeApplied = useRef(false);
  const [state, setState] = useState<DesignState>(
    () =>
      runtime?.initialState ??
      Object.assign(createDesignState(readParam("sample") === "true"), {
        accountName: "Demo",
        patients: createDesignState(
          readParam("sample") === "true",
        ).patients.map((p) => ({ ...p, name: "Demo" })),
      }),
  );
  const [stack, setStack] = useState<Location[]>(() => [
    { view: runtime ? "home" : initialView() },
  ]);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const setDirty = (value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  };
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [message, setMessage] = useState("");
  const [scenario, setScenario] = useState("normal");
  const committing = useRef(false);
  const [inspector, setInspector] = useState(false);
  const [ui, setUI] = useState<PreviewUI>({
    agendaDay: new Date(),
    agendaMonth: new Date(),
    historyTab: "agenda",
    documentFilter: "all",
    documentSearch: "",
  });
  const location = stack.at(-1)!;
  const patient = state.patients.find((p) => p.id === state.activePatientId)!;
  const [uiPatientId, setUiPatientId] = useState(patient.id);
  if (uiPatientId !== patient.id) {
    // Reset before rendering another patient's screens, without an effect frame.
    setUiPatientId(patient.id);
    setUI((s) => ({
      ...s,
      documentSearch: "",
      documentFilter: "all",
      historySearch: "",
      historyGroup: "all",
      historyYear: "all",
      historyMonth: "all",
      treatmentGrouping: "treatment",
    }));
  }
  useEffect(() => {
    if (!runtime) return;
    try {
      runtime.savePreferences(state);
    } catch {
      queueMicrotask(() =>
        setMessage(
          "No se pudo conservar el cambio en este equipo. Revisa el espacio disponible.",
        ),
      );
    }
  }, [state, runtime]);
  const guard = (action: () => void) => {
    if (committing.current) {
      notify("Espera a que termine el guardado.");
      return;
    }
    if (dirtyRef.current) setPending(() => action);
    else action();
  };
  const go: PreviewContextValue["go"] = (view, id) =>
    guard(() => {
      setSheet(null);
      setStack((s) =>
        view === "login" ||
        (view === "home" &&
          ["login", "register", "recover", "onboarding"].includes(
            location.view,
          ))
          ? [{ view, ...(id ? { id } : {}) }]
          : [...s, { view, ...(id ? { id } : {}) }],
      );
    });
  const back = () =>
    guard(() => {
      if (sheet) setSheet(null);
      else
        setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ view: "home" }]));
    });
  const notify = (text: string) => setMessage(text);
  const reset = (populated: boolean) =>
    guard(() => {
      const fresh = createDesignState(populated);
      fresh.accountName = "Demo";
      fresh.patients[0]!.name = "Demo";
      setState(fresh);
      setSheet(null);
      setDirty(false);
      setStack([{ view: "home" }]);
      setScenario("normal");
      setUI({
        agendaDay: new Date(),
        agendaMonth: new Date(),
        historyTab: "agenda",
        documentFilter: "all",
        documentSearch: "",
      });
      setMessage(populated ? "Ejemplo cargado" : "Perfil de prueba vacío");
    });
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (inspector) {
        setInspector(false);
        return true;
      }
      if (sheet || stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });
  useEffect(() => {
    if (initialThemeApplied.current) return;
    initialThemeApplied.current = true;
    setMode("light");
  }, [setMode]);
  const editState: PreviewContextValue["editState"] = async (change, text) => {
    if (committing.current)
      throw new Error("Espera a que termine el guardado.");
    if (scenario === "save-error")
      throw new Error(
        "No pudimos guardar. El borrador sigue disponible; cambia el escenario e inténtalo otra vez.",
      );
    if (scenario === "offline")
      throw new Error("Sin conexión. Conservamos el borrador para reintentar.");
    let next = change(state);
    committing.current = true;
    try {
      if (runtime) next = await runtime.commit(next, state);
    } finally {
      committing.current = false;
    }
    setState(next);
    setDirty(false);
    if (text) notify(text);
  };
  const edit: PreviewContextValue["edit"] = (change, text) =>
    editState((s) => updatePatient(s, s.activePatientId, change), text);
  useEffect(() => {
    if (!runtime) return;
    const restore = () => {
      const job = state.notificationsEnabled
        ? restoreReminders(patient.reminders, `${runtime.notificationScope ?? "local"}::${patient.id}`)
        : clearDeviceReminders();
      void job.catch(() => setMessage("No se pudieron restaurar los avisos de este dispositivo. Revisa los permisos."));
    };
    restore();
    const subscription = AppState.addEventListener("change", state => { if(state === "active")restore(); });
    return () => subscription.remove();
  }, [runtime, patient.id, patient.reminders, state.notificationsEnabled]);
  const context: PreviewContextValue = {
    state,
    production: !!runtime,
    persistence: runtime?.persistence ?? "local",
    ...(runtime?.notificationScope
      ? { notificationScope: `${runtime.notificationScope}::${patient.id}` }
      : {}),
    ...(runtime?.accountEmail ? { accountEmail: runtime.accountEmail } : {}),
    ...(runtime?.confirmNumbering
      ? { confirmNumbering: runtime.confirmNumbering }
      : {}),
    ...(runtime?.signOut
      ? {
          signOut: async () => {
            await clearDeviceReminders();
            await runtime.signOut!();
          },
        }
      : {}),
    setState,
    patient,
    location,
    go,
    back,
    reset,
    sheet,
    education,
    closeEducation: () => setEducation(null),
    open: (next) =>
      next.kind === "education"
        ? setEducation(next.term ?? "")
        : guard(() => setSheet(next)),
    close: () => guard(() => setSheet(null)),
    edit,
    editState,
    dirty,
    setDirty,
    notify,
    ui,
    setUI,
    scenario,
    setScenario,
  };
  const tabs: {
    key: DesignTab;
    label: string;
    icon: "home" | "tooth" | "calendar" | "documents" | "user";
  }[] = [
    { key: "home", label: "Inicio", icon: "home" },
    { key: "odontogram", label: "Mi boca", icon: "tooth" },
    { key: "history", label: "Seguimiento", icon: "calendar" },
    { key: "documents", label: "Documentos", icon: "documents" },
  ];
  const roots = tabs.map((t) => t.key);
  const root = roots.includes(location.view as DesignTab);
  const auth = ["login", "register", "recover", "onboarding"].includes(
    location.view,
  );
  const active =
    location.view === "profile"
      ? "profile"
      : roots.includes(location.view as DesignTab)
        ? location.view
        : ["budget", "prescription", "viewer", "capture"].includes(
              location.view,
            )
          ? "documents"
          : [
                "account",
                "patient",
                "preferences",
                "privacy",
                "plan",
                "family",
                "guides",
              ].includes(location.view)
            ? "profile"
            : location.view === "notifications"
              ? (stack
                  .slice(0, -1)
                  .reverse()
                  .find((l) => roots.includes(l.view as DesignTab))?.view ??
                "home")
              : "history";
  const tabbar = !auth && location.view !== "capture";
  const showHeader = location.view !== "capture";
  const selectTab = (key: DesignTab) =>
    guard(() => {
      setSheet(null);
      setStack([{ view: key }]);
    });
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        minHeight: 0,
        alignItems: "center",
        backgroundColor: width >= 600 ? "#e8eeea" : c.background,
        paddingVertical: width >= 600 && !runtime ? 16 : 0,
      }}
    >
      {width >= 600 && !runtime ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            paddingBottom: 12,
          }}
        >
          <Text size="sm" style={{ color: "#173c45" }}>
            Alternativa A · interfaz móvil
          </Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setInspector(true)}
            accessibilityLabel="Opciones de la propuesta"
          >
            <Text style={{ color: "#176c82" }}>Revisar</Text>
          </Button>
        </View>
      ) : null}
      <View
        testID="mobile-preview"
        style={{
          width: "100%",
          maxWidth: 430,
          flex: runtime ? 1 : undefined,
          height: runtime
            ? undefined
            : width >= 600
              ? Math.min(height - 88, 880)
              : height,
          minHeight: 0,
          overflow: "hidden",
          borderRadius: width >= 600 && !runtime ? 28 : 0,
          borderWidth: width >= 600 && !runtime ? 1 : 0,
          borderColor: "#cbd7d5",
        }}
      >
        <PreviewContext.Provider value={context}>
          <PanelUIProvider>
            <StatusBar style="dark" />
            <AppBackground>
              <View
                className="flex-1 bg-background"
                style={{ paddingTop: insets.top, ...(location.view === 'home' && isHomeGuideRequested() && state.numberingConfirmed ? {backgroundColor: guideColors.background} : {}) }}
              >
                {showHeader ? (
                  <View
                    className="flex-row items-center justify-between px-4"
                    style={{ minHeight: 58 }}
                  >
                    {!root && !auth ? (
                      <Button
                        variant="ghost"
                        accessibilityLabel="Volver"
                        onPress={back}
                      >
                        <PIcon name="back" />
                        <Text>Volver</Text>
                      </Button>
                    ) : null}
                    <View className="flex-1" />
                    <View className="flex-row">
                      {!auth && root ? (
                        <>
                          <Button
                            variant="ghost"
                            accessibilityLabel="Notificaciones"
                            onPress={() => {
                              setState((s) => ({
                                ...s,
                                readNotificationIds: [
                                  ...new Set([
                                    ...(s.readNotificationIds ?? []),
                                    ...patient.reminders.map((r) => r.id),
                                  ]),
                                ],
                              }));
                              go("notifications");
                            }}
                          >
                            <PIcon name="bell" />
                            {state.notificationsEnabled &&
                            patient.reminders.some(
                              (r) => !state.readNotificationIds?.includes(r.id),
                            ) ? (
                              <Badge
                                count={
                                  patient.reminders.filter(
                                    (r) =>
                                      !state.readNotificationIds?.includes(
                                        r.id,
                                      ),
                                  ).length
                                }
                                size="xs"
                                className="absolute top-0 right-0"
                              />
                            ) : null}
                          </Button>
                          <Button
                            variant="ghost"
                            accessibilityLabel="Abrir perfil"
                            onPress={() => go("profile")}
                          >
                            <PIcon name="user" />
                          </Button>
                        </>
                      ) : null}
                      {width < 600 && !runtime ? (
                        <Button
                          variant="ghost"
                          className="min-h-12 min-w-12 px-2"
                          accessibilityLabel="Opciones de la propuesta"
                          onPress={() => setInspector(true)}
                        >
                          <PIcon name="info" size={21} />
                        </Button>
                      ) : null}
                    </View>
                  </View>
                ) : state.patients.length > 1 ? (
                  <View className="items-end px-4 pt-1">
                    <Button
                      variant="ghost"
                      accessibilityLabel="Cambiar perfil dental"
                      onPress={() => context.open({ kind: "patient-picker" })}
                    >
                      <Text size="sm">{patient.name}</Text>
                      <PIcon name="chevron" size={13} />
                    </Button>
                  </View>
                ) : null}
                <View className="flex-1 min-h-0">
                  <PreviewScreens />
                </View>
                {tabbar ? (
                  <View
                    className="flex-row bg-card border-t border-border"
                    style={{ paddingBottom: Math.max(6, insets.bottom), ...(location.view === 'home' && isHomeGuideRequested() && state.numberingConfirmed ? {backgroundColor: guideColors.background, borderColor: guideColors.rule} : {}) }}
                    accessibilityRole="tablist"
                    accessibilityLabel="Navegación principal"
                  >
                    {tabs.map((tab, index) => (
                      <AnimatedPressable
                        key={tab.key}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: active === tab.key }}
                        {...(Platform.OS === "web"
                          ? {
                              "aria-selected": active === tab.key,
                              tabIndex: active === tab.key ? 0 : -1,
                              onKeyDown: (event: {
                                key: string;
                                preventDefault: () => void;
                                currentTarget: HTMLElement;
                              }) => {
                                const next =
                                  event.key === "Home"
                                    ? 0
                                    : event.key === "End"
                                      ? tabs.length - 1
                                      : event.key === "ArrowRight"
                                        ? (index + 1) % tabs.length
                                        : event.key === "ArrowLeft"
                                          ? (index + tabs.length - 1) %
                                            tabs.length
                                          : null;
                                if (next === null) return;
                                event.preventDefault();
                                selectTab(tabs[next]!.key);
                                event.currentTarget.parentElement
                                  ?.querySelectorAll<HTMLElement>(
                                    '[role="tab"]',
                                  )
                                  [next]?.focus();
                              },
                            }
                          : {})}
                        pressScale={1}
                        onPress={() => selectTab(tab.key)}
                        className="flex-1 min-w-0 items-center justify-center py-2"
                        style={{ minHeight: 64, gap: 4 }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 13,
                            paddingVertical: 3,
                            borderRadius: 12,
                            backgroundColor:
                              active === tab.key ? "#dcebe8" : "transparent",
                          }}
                        >
                          <PIcon
                            name={tab.icon}
                            muted={active !== tab.key}
                            size={22}
                          />
                        </View>
                        <Text
                          style={{
                            fontSize: width < 360 ? 10 : 11,
                            lineHeight: 14,
                            textAlign: "center",
                          }}
                          weight={active === tab.key ? "semibold" : "normal"}
                        >
                          {tab.label}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </AppBackground>
            <PreviewSheets />
            <Dialog open={inspector} onOpenChange={setInspector}>
              <Dialog.Content>
                <Dialog.Title>Revisar la alternativa A</Dialog.Title>
                <Dialog.Description>
                  Estado de prueba en memoria, separado de tus registros. No se
                  ejecutan OCR, pagos o alarmas reales.
                </Dialog.Description>
                <NamedSelect
                  accessibilityLabel="Escenario de prueba"
                  value={scenario}
                  onValueChange={(value) => {
                    setScenario(value);
                    setInspector(false);
                  }}
                >
                  <NamedSelect.Item value="normal" label="Normal" />
                  <NamedSelect.Item
                    value="save-error"
                    label="Fallo al guardar"
                  />
                  <NamedSelect.Item value="offline" label="Sin conexión" />
                  <NamedSelect.Item value="loading" label="Cargando" />
                  <NamedSelect.Item value="load-error" label="Fallo de carga" />
                </NamedSelect>
                <Button
                  variant="outline"
                  onPress={() => {
                    setInspector(false);
                    reset(true);
                  }}
                >
                  Cargar ejemplo
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    setInspector(false);
                    reset(false);
                  }}
                >
                  Perfil vacío
                </Button>
                <Button
                  variant="outline"
                  onPress={() => {
                    setState((s) =>
                      updatePatient(s, s.activePatientId, (p) => ({
                        ...p,
                        budgets: p.budgets.map((b) => ({ ...b, image: "" })),
                        prescriptions: p.prescriptions.map((r) => ({
                          ...r,
                          image: "",
                        })),
                      })),
                    );
                    setInspector(false);
                  }}
                >
                  Simular original ausente
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    setInspector(false);
                    go("login");
                  }}
                >
                  Revisar acceso
                </Button>
                <Button onPress={() => setInspector(false)}>
                  Volver a la app
                </Button>
              </Dialog.Content>
            </Dialog>
            <Dialog
              open={!!pending}
              onOpenChange={(open) => {
                if (!open) setPending(null);
              }}
            >
              <Dialog.Content>
                <Dialog.Title>¿Descartar los cambios?</Dialog.Title>
                <Dialog.Description>
                  Tu borrador todavía no se ha guardado.
                </Dialog.Description>
                <Dialog.Footer>
                  <Button variant="outline" onPress={() => setPending(null)}>
                    Seguir editando
                  </Button>
                  <Button
                    variant="destructive"
                    onPress={() => {
                      const action = pending;
                      setDirty(false);
                      setPending(null);
                      action?.();
                    }}
                  >
                    Descartar
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog>
            {message ? (
              <View
                style={{
                  position: "absolute",
                  bottom: 82,
                  left: 12,
                  right: 12,
                }}
              >
                <Toast variant="success" onHide={() => setMessage("")}>
                  <Toast.Content>
                    <Toast.Title>{message}</Toast.Title>
                  </Toast.Content>
                  <Toast.Close accessibilityLabel="Cerrar aviso" />
                </Toast>
              </View>
            ) : null}
          </PanelUIProvider>
        </PreviewContext.Provider>
      </View>
    </View>
  );
}
