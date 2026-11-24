import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { demoPatientTeeth } from '../domain/teeth/catalog';
import type { ClinicalEvent, DentalAppointment } from '../domain/clinical/types';
import type { ToothDetail } from '../domain/teeth/types';
import type { BudgetCaptureDraft } from '../features/documents/types';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { DocumentsScreen } from '../features/documents/DocumentsScreen';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { DocumentCaptureScreen } from '../features/documents/DocumentCaptureScreen';
import { OdontogramScreen } from '../features/odontogram/OdontogramScreen';
import { ToothDetailModal } from '../features/odontogram/ToothDetailModal';
import { PreventiveCareScreen } from '../features/care/PreventiveCareScreen';
import { AuthGate } from '../features/auth/AuthGate';
import { PatientOnboardingScreen } from '../features/patients/PatientOnboardingScreen';
import { WorkspaceScreen } from '../features/workspace/WorkspaceScreen';
import { isWorkspaceRoute, workspaceScreens } from '../features/workspace/screens';
import { LocalDentalRepository } from '../infra/local/LocalDentalRepository';
import { PatientHeader } from '../ui/PatientHeader';
import { UnsavedChangesProvider } from '../ui/UnsavedChanges';
import { BottomNavigation } from '../app/BottomNavigation';
import { rootTabForRoute, type AppRoute } from '../app/navigation';
import { colors } from '../ui/theme';

type Fixture = 'demo' | 'worst' | 'empty' | 'one' | 'huge' | 'loading' | 'error' | 'unicode';
const fixtureNames: Record<Fixture, string> = { demo: 'Demo data', worst: 'Worst case', empty: 'Empty', one: 'One', huge: '1,000 rows', loading: 'Loading', error: 'Error', unicode: 'Unicode' };
const scenes = { home: 'Inicio', odontogram: 'Odontograma', history: 'Seguimiento', documents: 'Documentos', profile: 'Perfil', 'document-capture': 'Captura', 'preventive-care': 'Guías', detail: 'Detalle dental', auth: 'Acceso', onboarding: 'Alta inicial', ...Object.fromEntries(Object.entries(workspaceScreens).map(([key, screen]) => [key, screen.title])) };
const repository = new LocalDentalRepository();
// No real requests, credentials, sessions or writes in this fixture gallery.
const mockClient = { auth: { signInWithPassword: async () => ({ error: { message: 'Invalid login credentials' } }), signUp: async () => ({ data: { session: null }, error: { message: 'UI fixture only' } }) } } as unknown as SupabaseClient;
const longName = 'María José de la Cruz y Fernández';
const longClinic = 'Centro de Especialidades Odontológicas y Rehabilitación Integral';
const longText = 'Consulta de seguimiento para revisar la evolución del tratamiento y las indicaciones entregadas por el profesional. Llevar el presupuesto original y confirmar qué piezas se atenderán antes de la sesión.';
const scheduledAt = (index = 0) => { const date = new Date(); date.setDate(date.getDate() - index); date.setHours(18, 0, 0, 0); return date.toISOString(); };
const tooth = demoPatientTeeth.find((item) => item.fdi === '16')!;

export function UIReview() {
  const params = new URLSearchParams(window.location.search);
  const [scene, setScene] = useState(params.get('scene') ?? 'profile');
  const [fixture, setFixture] = useState<Fixture>((params.get('data') as Fixture) in fixtureNames ? params.get('data') as Fixture : 'demo');
  const [zoom, setZoom] = useState(params.get('zoom') === '2' ? 2 : 1);
  const update = (nextScene: string, nextFixture = fixture, nextZoom = zoom) => {
    setScene(nextScene); setFixture(nextFixture); setZoom(nextZoom);
    window.history.replaceState(null, '', `?scene=${encodeURIComponent(nextScene)}&data=${nextFixture}&zoom=${nextZoom}`);
  };
  const worst = fixture === 'worst' || fixture === 'huge';
  const name = fixture === 'empty' ? null : fixture === 'one' ? 'J' : fixture === 'unicode' ? '👩🏽‍💻 Đặng Thị Ngọc Hân' : worst ? longName : 'Leo';
  const email = fixture === 'empty' ? null : worst ? 'bartholomew.fitzgerald@northwind-industries-holdings.example.com' : 'leo@example.test';
  const count = fixture === 'empty' ? 0 : fixture === 'huge' ? 1000 : worst ? 5 : fixture === 'one' ? 1 : 2;
  const teeth = demoPatientTeeth.map((item) => ({ ...item, summary: worst ? longText : item.summary }));
  const appointments: DentalAppointment[] = Array.from({ length: count }, (_, index) => ({ id: `qa-appointment-${index}`, scheduledAt: scheduledAt(index), toothIds: index % 2 ? [] : [tooth.id], status: (['confirmed', 'scheduled', 'cancelled', 'completed', 'missed'] as const)[index % 5]!, locationLabel: worst ? longClinic : index % 2 ? null : 'Clínica de prueba', notes: worst ? longText : null, durationMinutes: index % 2 ? null : 45 }));
  const events: ClinicalEvent[] = Array.from({ length: count }, (_, index) => ({ id: `qa-event-${index}`, toothIds: index % 2 ? [] : [tooth.id], occurredAt: scheduledAt(index), type: (['procedure', 'control', 'diagnosis', 'prescription', 'instruction', 'document'] as const)[index % 6]!, title: worst ? `Seguimiento de rehabilitación oral — atención ${index + 1}` : 'Control de evolución' }));
  const drafts: BudgetCaptureDraft[] = Array.from({ length: count }, (_, index) => ({ id: `qa-document-${index}`, localUri: fixture === 'error' ? 'data:image/png;base64,invalid-image' : `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#e2f2f5"/><text x="20" y="50" font-size="16">Archivo de prueba</text></svg>')}`, fileName: worst ? 'IMG_20250914_183022_HDR_portrait_edited_edited.HEIC' : 'presupuesto-de-prueba.png', numberingSystem: index % 2 ? 'unknown' : 'fdi', clinicHint: worst && index % 2 === 0 ? longClinic : '', createdAt: scheduledAt(), status: 'ready_for_ocr' }));
  const error = fixture === 'error' ? 'No se pudo consultar la información. Revisa tu conexión e inténtalo nuevamente.' : null;
  const loading = fixture === 'loading';
  const professionalNames = worst ? [`${longName} (prueba)`, 'Aleksandra Wiśniewska-Kowalczyk (prueba)']
    : fixture === 'one' ? ['Profesional de prueba A'] : fixture === 'unicode' ? ['Đặng Thị Ngọc Hân (prueba)']
    : ['Profesional de prueba A', 'Profesional de prueba B'];
  const detail: ToothDetail = {
    tooth: { ...tooth, summary: worst ? longText : tooth.summary },
    currentTreatment: fixture === 'empty' ? null : { id: 'qa-treatment', title: worst ? 'Rehabilitación oral mediante tratamiento endodóntico y restauración definitiva' : 'Endodoncia', status: 'active', completedSessions: professionalNames.length, totalSessions: fixture === 'one' ? 1 : null, professionalNames },
    events: fixture === 'empty' ? [] : professionalNames.map((professionalName, index) => ({ id: `qa-tooth-event-${index}`, title: worst ? longText : 'Control dental', date: '2026-10-13', type: 'control', details: worst ? longText : 'Registro de prueba', professionalName })),
    notes: fixture === 'empty' ? [] : [{ id: 'qa-note', title: 'Indicaciones registradas', body: worst ? longText : 'Nota de prueba sin indicación médica real.' }],
    documents: fixture === 'empty' ? [] : [{ id: 'qa-file', name: worst ? drafts[0]!.fileName : 'radiografía.png', kind: 'xray', availability: 'metadata_only' }],
  };
  const onBack = () => update('home');
  const onNavigate = (next: string) => update(next);
  const tab = scene === 'detail' ? 'odontogram' : ['auth', 'onboarding'].includes(scene) ? 'home' : rootTabForRoute(scene as AppRoute);
  const screen = (() => {
    if (scene === 'home') return <DashboardScreen displayName={name} appointments={loading ? null : appointments} appointmentsError={error} teeth={teeth} onNavigate={onNavigate} />;
    if (scene === 'profile') return <ProfileScreen displayName={name} email={email} onNavigate={onNavigate} />;
    if (scene === 'documents') return <DocumentsScreen drafts={drafts} onNavigate={onNavigate} onOpenCapture={() => update('document-capture')} onOpenDraft={() => update('document-viewer')} />;
    if (scene === 'history') return <HistoryScreen events={loading ? null : events} error={error} teeth={teeth} sessions={loading ? null : []} sessionsError={error} appointments={loading ? null : appointments} appointmentsError={error} onOpenForm={onNavigate} onOpenRecord={onNavigate} />;
    if (scene === 'odontogram') return <OdontogramScreen repository={repository} teeth={teeth} onToothUpdated={() => undefined} />;
    if (scene === 'detail') return <ToothDetailModal tooth={tooth} detail={detail} error={error} loading={loading} numbering="fdi" onClose={onBack} onSave={async () => { throw new Error('UI review cannot save'); }} />;
    if (scene === 'document-capture') return <DocumentCaptureScreen onBack={onBack} onSaveDraft={() => update('documents')} />;
    if (scene === 'preventive-care') return <PreventiveCareScreen onBack={onBack} />;
    if (scene === 'auth') return <AuthGate client={mockClient} />;
    if (scene === 'onboarding') return <PatientOnboardingScreen onSubmit={async () => { throw new Error('UI review cannot save'); }} />;
    if (isWorkspaceRoute(scene)) return <WorkspaceScreen route={scene} onBack={onBack} onNavigate={onNavigate} {...(scene === 'budget-review' || scene === 'document-viewer' ? { capture: drafts[0] } : {})} />;
    return null;
  })();
  return <div style={{width:'100%',height:'100dvh',display:'flex',flexDirection:'column',background:colors.surfaceMuted}}>
    <div style={{flex:1,minWidth:0,minHeight:0,zoom,display:'flex'}}><SafeAreaProvider style={{flex:1,minWidth:0}}><UnsavedChangesProvider><View style={{flex:1,alignSelf:'center',width:'100%',maxWidth:720,backgroundColor:colors.background}}>
      {['home', 'history', 'documents', 'profile', 'odontogram'].includes(scene) ? <PatientHeader displayName={name} isHome={scene === 'home'} onNavigate={onNavigate} /> : null}
      <View key={`${scene}-${fixture}`} style={{flex:1}}>{screen}</View>
      {!['auth', 'onboarding'].includes(scene) ? <BottomNavigation activeTab={tab} onSelect={onNavigate} /> : null}
    </View></UnsavedChangesProvider></SafeAreaProvider></div>
    <div style={{flexShrink:0,display:'flex',gap:4,padding:4,background:'#e5e7eb',fontFamily:'sans-serif'}}>
      <select aria-label="Vista de prueba" value={scene} onChange={(event) => update(event.target.value)} style={{minWidth:0,flex:1}}>{Object.entries(scenes).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
      <select aria-label="Datos de prueba" value={fixture} onChange={(event) => update(scene,event.target.value as Fixture)} style={{minWidth:0,flex:1}}>{Object.entries(fixtureNames).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
      <select aria-label="Zoom de prueba" value={zoom} onChange={(event) => update(scene,fixture,Number(event.target.value))}><option value={1}>100%</option><option value={2}>200%</option></select>
    </div>
  </div>;
}
