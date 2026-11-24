import { useEffect, useState } from 'react';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';

import type { DentalRepository } from '../core/data/DentalRepository';
import type { ClinicalEvent, ClinicalSession, DentalAppointment } from '../domain/clinical/types';
import type { PatientTooth } from '../domain/teeth/types';
import { PreventiveCareScreen } from '../features/care/PreventiveCareScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { DocumentCaptureScreen } from '../features/documents/DocumentCaptureScreen';
import { ConfirmedBudgetScreen } from '../features/documents/ConfirmedBudgetScreen';
import { PrescriptionCaptureScreen } from '../features/documents/PrescriptionCaptureScreen';
import type { DocumentImage } from '../features/documents/pickDocumentImage';
import { ConfirmedPrescriptionScreen } from '../features/documents/ConfirmedPrescriptionScreen';
import type { ConfirmedPrescription } from '../features/documents/prescriptionProposal';
import { DocumentsScreen } from '../features/documents/DocumentsScreen';
import type { BudgetCaptureDraft } from '../features/documents/types';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { RecordSessionScreen } from '../features/history/RecordSessionScreen';
import { AppointmentForm } from '../features/history/AppointmentForm';
import { OdontogramScreen } from '../features/odontogram/OdontogramScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { WorkspaceScreen } from '../features/workspace/WorkspaceScreen';
import { isWorkspaceRoute } from '../features/workspace/screens';
import { PatientHeader } from '../ui/PatientHeader';
import { UnsavedChangesProvider, useGuardedNavigation } from '../ui/UnsavedChanges';
import { BottomNavigation } from './BottomNavigation';
import { rootTabForRoute, type AppRoute, type AppTab } from './navigation';

interface AppNavigatorProps {
  repository: DentalRepository;
  displayName: string | null;
  teeth: readonly PatientTooth[];
  events: readonly ClinicalEvent[] | null;
  eventsError: string | null;
  sessions: readonly ClinicalSession[] | null;
  sessionsError: string | null;
  appointments: readonly DentalAppointment[] | null;
  appointmentsError: string | null;
  email: string | null;
  onSignOut?: () => Promise<void>;
  onToothUpdated: (tooth: PatientTooth) => void;
  onSessionSaved: () => void;
}

interface NavigationEntry {
  readonly route: AppRoute;
  readonly context?: string;
  readonly capture?: BudgetCaptureDraft;
  readonly prescription?: ConfirmedPrescription;
  readonly initialImage?: DocumentImage;
}

const demoBudgetKey = 'dentaltrack.demo.confirmed-budgets.v1';
const demoPrescriptionKey = 'dentaltrack.demo.confirmed-prescriptions.v1';

export function AppNavigator(props: AppNavigatorProps) {
  return <UnsavedChangesProvider><GuardedNavigator {...props} /></UnsavedChangesProvider>;
}

function GuardedNavigator({
  repository,
  displayName,
  teeth,
  events,
  eventsError,
  sessions,
  sessionsError,
  appointments,
  appointmentsError,
  email,
  onSignOut,
  onToothUpdated,
  onSessionSaved,
}: AppNavigatorProps) {
  const navigate = useGuardedNavigation();
  const [routes, setRoutes] = useState<readonly NavigationEntry[]>([{ route: 'home' }]);
  const entry = routes[routes.length - 1] ?? { route: 'home' as const };
  const { route, context, capture, prescription, initialImage } = entry;
  const setRoute = (next: AppRoute) => navigate(() => setRoutes((current) => [...current, { route: next }]));
  const openRecord = (next: AppRoute, label: string) => navigate(() => setRoutes((current) => [...current, { route: next, context: label }]));
  const goBack = () => navigate(() => setRoutes((current) => current.length > 1 ? current.slice(0, -1) : [{ route: 'home' }]));
  const [budgetDrafts, setBudgetDrafts] = useState<readonly BudgetCaptureDraft[]>(() => {
    if (repository.mode !== 'local-demo') return [];
    try { return JSON.parse(globalThis.localStorage.getItem(demoBudgetKey) ?? '[]') as BudgetCaptureDraft[]; }
    catch { return []; }
  });
  const [prescriptions, setPrescriptions] = useState<readonly ConfirmedPrescription[]>(() => {
    if (repository.mode !== 'local-demo') return [];
    try { return JSON.parse(globalThis.localStorage.getItem(demoPrescriptionKey) ?? '[]') as ConfirmedPrescription[]; }
    catch { return []; }
  });
  const activeTab = rootTabForRoute(route);
  const selectTab = (tab: AppTab) => { if (route !== tab) navigate(() => setRoutes([{ route: tab }])); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length < 2) return false;
      navigate(() => setRoutes((current) => current.slice(0, -1))); return true;
    });
    return () => subscription.remove();
  }, [routes.length, navigate]);

  const historyScreen = (<HistoryScreen
            initialSection={context === 'recorded' ? 'history' : 'agenda'}
            error={eventsError}
            events={events}
            sessions={sessions}
            sessionsError={sessionsError}
            onOpenForm={setRoute}
            onOpenRecord={openRecord}
            appointments={appointments}
            appointmentsError={appointmentsError}
            teeth={teeth}
          />);
  const sheet = ['appointment-form', 'session-form', 'reminder-form'].includes(route);
  const screen = (() => {
    if (route === 'appointment-form') return <AppointmentForm onBack={() => setRoute('history')} onSave={async (input) => { await repository.createAppointment(input); onSessionSaved(); }} />;
    if (route === 'prescription-capture') return <PrescriptionCaptureScreen onBack={goBack} {...(initialImage ? { initialImage } : {})} {...(repository.mode === 'local-demo' ? { onConfirm: (record: ConfirmedPrescription) => {
      const next = [record, ...prescriptions];
      globalThis.localStorage.setItem(demoPrescriptionKey, JSON.stringify(next));
      setPrescriptions(next);
      setRoutes([{ route: 'documents' }]);
    } } : {})} />;
    if (route === 'prescription-detail' && prescription) return <ConfirmedPrescriptionScreen prescription={prescription} onBack={goBack} />;
    if (route === 'session-form') return <RecordSessionScreen onBack={goBack} onSave={async (input) => {
      await repository.recordSession(input);
      onSessionSaved();
      setRoutes((current) => current.at(-1) === entry ? [{ route: 'history', context: 'recorded' }] : current);
    }} />;
    if (route === 'budget-detail' && capture?.status === 'confirmed') return <ConfirmedBudgetScreen budget={capture} onBack={goBack} />;
    if (isWorkspaceRoute(route)) return <WorkspaceScreen key={route} route={route} onBack={goBack} onNavigate={(next) => {
      const preserveCapture = capture && ['document-viewer', 'budget-review', 'budget-detail', 'budget-payments'].includes(next);
      const preserveContext = context && ['session-form', 'appointment-form', 'session-care', 'reminder-form'].includes(next);
      navigate(() => setRoutes((current) => [...current, { route: next, ...(preserveCapture ? { capture } : {}), ...(preserveContext ? { context } : {}) }]));
    }} {...(context ? { context } : {})} {...(capture ? { capture } : {})} />;
    switch (route) {
      case 'home':
        return (
          <DashboardScreen
            displayName={displayName}
            onNavigate={setRoute}
            appointments={appointments}
            appointmentsError={appointmentsError}
            teeth={teeth}
          />
        );
      case 'odontogram':
        return <OdontogramScreen onToothUpdated={onToothUpdated} repository={repository} teeth={teeth} />;
      case 'history': return historyScreen;
      case 'documents':
        return <DocumentsScreen drafts={budgetDrafts} prescriptions={prescriptions}
          onOpenPrescription={(record) => setRoutes((current) => [...current, { route: 'prescription-detail', prescription: record }])}
          onOpenCapture={(image) => setRoutes(current => [...current, { route: 'document-capture', ...(image ? { initialImage: image } : {}) }])}
          onCapturePrescription={(image) => setRoutes(current => [...current, { route: 'prescription-capture', initialImage: image }])}
          onNavigate={setRoute} onOpenDraft={(draft) => setRoutes((current) => [...current, { route: draft.status === 'confirmed' ? 'budget-detail' : 'document-capture', capture: draft }])} />;
      case 'profile':
        return (
          <ProfileScreen
            displayName={displayName}
            email={email}
            onNavigate={setRoute}
            {...(onSignOut ? { onSignOut } : {})}
          />
        );
      case 'preventive-care':
        return <PreventiveCareScreen onBack={goBack} />;
      case 'document-capture':
        return (
          <DocumentCaptureScreen
            onBack={goBack}
            canConfirmLocally={repository.mode === 'local-demo'}
            {...(capture ? { capture } : {})}
            {...(initialImage ? { initialImage } : {})}
            onSaveDraft={(draft) => {
              const next = [draft, ...budgetDrafts.filter((item) => item.id !== draft.id)];
              if (draft.status === 'confirmed') {
                if (repository.mode !== 'local-demo') throw new Error('El guardado del presupuesto todavía no está disponible en esta cuenta.');
                globalThis.localStorage.setItem(demoBudgetKey, JSON.stringify(next.filter((item) => item.status === 'confirmed').map((item) => ({ ...item, localUri: '' }))));
              }
              setBudgetDrafts(next);
              if (draft.status === 'confirmed') onSessionSaved();
              setRoutes([{ route: 'documents' }]);
            }}
          />
        );
    }
  })();

  return (
    <View style={styles.container}>
      {route === activeTab ? <PatientHeader displayName={displayName} isHome={route === 'home'} onNavigate={setRoute} /> : null}
      <View style={styles.screen}>{sheet ? historyScreen : screen}</View>
      {sheet ? <Modal transparent animationType="slide" onRequestClose={goBack}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,36,62,0.4)' }}><View style={{ height: '90%', width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: '#FBFCFE', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>{screen}</View></View></Modal> : null}
      <BottomNavigation activeTab={activeTab} onSelect={selectTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
});
