import { RemoteWorkspace, validateRemoteState, mergeLocalRecords } from "./remoteWorkspace";
import { supabaseClient } from "../../core/data/repository";
import { useEffect, useState, useMemo, type ComponentProps } from "react";
import { Text, View } from "react-native";
import type { AppNavigator } from "../../app/AppNavigator";
import { MobilePreview, type MobileRuntime } from "./MobilePreview";
import { deviceStorage } from "./deviceStorage";
import { hydrateWorkspace, commitClinicalChanges } from "./runtimeModel";
import type { DesignState } from "./model";
import type { BudgetCaptureDraft } from "../../features/documents/types";
import type { ConfirmedPrescription } from "../../features/documents/prescriptionProposal";
import { durableUri } from "./media";
import { Button } from './components';
type Props = ComponentProps<typeof AppNavigator> & { storageScope: string };
export function PatientWorkspace(props: Props) {
  const [loadRetry,setLoadRetry]=useState(0);
  const [preferenceError, setPreferenceError] = useState("");
  const remote = useMemo(()=>supabaseClient && props.repository.mode==='supabase' ? new RemoteWorkspace(supabaseClient,props.storageScope):null,[props.storageScope,props.repository]);
  const [cloud,setCloud]=useState<DesignState|null|undefined>(()=>remote?undefined:null);
  useEffect(()=>{
    if(!remote)return;
    let mounted=true;
    void (async()=>{
      const raw=deviceStorage.get(`dentaltrack.workspace.v1.${props.storageScope}`);
      const local=raw?validateRemoteState(JSON.parse(raw)):null;
      const stored=await remote.load();
      const combined=stored?mergeLocalRecords(stored,local):local;
      if(combined && JSON.stringify(combined)!==JSON.stringify(stored)){
        if(raw)deviceStorage.set(`dentaltrack.workspace.before-sync.v1.${props.storageScope}`,raw);
        await remote.save(combined);
      }
      if(mounted)setCloud(combined);
    })().catch(e=>{if(mounted)setPreferenceError((e as Error).message);});
    return()=>{mounted=false;};
  },[remote,props.storageScope,loadRetry]);
  const [numberingAccount, setNumberingAccount] = useState<
    "fdi" | "universal" | null | undefined
  >(() => (supabaseClient ? undefined : null));
  useEffect(() => {
    let mounted = true;
    if (!supabaseClient) return;
    void supabaseClient.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!mounted) return;
        const value = data.session?.user.user_metadata.dentaltrack_numbering;
        setNumberingAccount(
          value === "fdi" || value === "universal" ? value : null,
        );
      })
      .catch(() => {
        if (mounted)
          setPreferenceError(
            "No se pudieron cargar tus preferencias. Recarga para reintentar.",
          );
      });
    return () => {
      mounted = false;
    };
  }, [loadRetry]);
  const runtime = useMemo<MobileRuntime | { error: string }>(() => {
    try {
      const key = `dentaltrack.workspace.v1.${props.storageScope}`;
      const raw = deviceStorage.get(key);
      const saved: DesignState | null = remote ? (cloud ?? null) : raw ? JSON.parse(raw) : null;
      if (
        saved &&
        (!Array.isArray(saved.patients) ||
          !saved.patients.length ||
          !saved.patients.some((p) => p.id === saved.activePatientId))
      )
        throw new Error(
          "El registro local no se puede abrir. Conservamos sus datos; no se reiniciará automáticamente.",
        );
      const initialState = hydrateWorkspace(
        saved,
        props.teeth,
        props.events ?? [],
        props.appointments ?? [],
        props.displayName,
      );
      if (numberingAccount) {
        initialState.numbering = numberingAccount;
        initialState.numberingConfirmed = true;
      }
      if (!saved && props.repository.mode === "local-demo") {
        const budgets: BudgetCaptureDraft[] = JSON.parse(
          deviceStorage.get("dentaltrack.demo.confirmed-budgets.v1") ?? "[]",
        );
        const prescriptions: ConfirmedPrescription[] = JSON.parse(
          deviceStorage.get("dentaltrack.demo.confirmed-prescriptions.v1") ??
            "[]",
        );
        initialState.patients[0]!.budgets = budgets
          .filter((b) => b.status === "confirmed")
          .map((b) => ({
            id: b.id,
            title: "Plan de tratamiento",
            clinic: b.clinicHint,
            image: b.localUri,
            rows: (b.items ?? []).map((r, i) => ({
              id: `${b.id}-${i}`,
              title: r.description,
              toothIds: r.toothId ? [r.toothId] : [],
              amount: r.amountClp,
              general: !r.toothId,
              done: false,
            })),
            payments: [],
          }));
        initialState.patients[0]!.prescriptions = prescriptions.map((p) => ({
          id: p.id,
          title: "Receta confirmada",
          date: p.createdAt,
          image: "",
          medicines: p.medicines.map((m, i) => ({
            id: `${p.id}-${i}`,
            name: m.name,
            instruction: m.sourceInstructions,
          })),
        }));
      }
      if (props.repository.mode === "local-demo" && saved)
        initialState.patients[0]!.toothStates = saved.patients[0]!.toothStates;
      const savePreferences = (state: DesignState) =>
        deviceStorage.set(key, JSON.stringify(state));
      return {
        initialState,
        persistence: remote ? 'remote' : 'local',
        notificationScope: props.storageScope,
        ...(props.email ? { accountEmail: props.email } : {}),
        savePreferences,
        confirmNumbering: async (numbering: "fdi" | "universal") => {
          if (supabaseClient) {
            const { error } = await supabaseClient.auth.updateUser({
              data: { dentaltrack_numbering: numbering },
            });
            if (error)
              throw new Error(
                "No se pudo guardar la numeración. Intenta otra vez.",
              );
          }
        },
        commit: async (next, previous) => {
          const durable = JSON.parse(JSON.stringify(next)) as DesignState;
          for (const p of durable.patients)
            for (const s of p.sessions)
              if (s.audioUri?.startsWith("blob:"))
                s.audioUri = await durableUri(s.audioUri);
          if(remote) await remote.save(durable, previous);
          else await commitClinicalChanges(props.repository, durable, previous);
          savePreferences(durable);
          return durable;
        },
        ...(props.onSignOut ? { signOut: props.onSignOut } : {}),
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
    // Loaded once per authenticated patient. Changes are owned by the workspace thereafter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.storageScope, props.repository, numberingAccount, remote, cloud]);
  if (preferenceError)
    return (
      <View style={{padding:24,gap:16}}>
        <Text accessibilityRole="alert">{preferenceError}</Text>
        <Button variant="outline" onPress={()=>{setPreferenceError('');setLoadRetry(value=>value+1);}}>Reintentar la carga</Button>
      </View>
    );
  if (numberingAccount === undefined || cloud === undefined)
    return (
      <View>
        <Text>Cargando preferencias…</Text>
      </View>
    );
  if ("error" in runtime || props.eventsError || props.appointmentsError)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text accessibilityRole="alert">
          {("error" in runtime ? runtime.error : "") ||
            props.eventsError ||
            props.appointmentsError ||
            "No se pudo abrir tu ficha."}
        </Text>
        <Button variant="outline" onPress={props.onSessionSaved}>
          Reintentar
        </Button>
      </View>
    );
  return <MobilePreview runtime={runtime} />;
}
