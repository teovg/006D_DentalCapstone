import { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  PatientProfileMissingError,
  type DentalRepository,
  type InitialPatientInput,
} from '../core/data/DentalRepository';
import type { ClinicalEvent, ClinicalSession, DentalAppointment } from '../domain/clinical/types';
import type { PatientTooth } from '../domain/teeth/types';
import { colors, spacing } from '../ui/theme';
import { PatientOnboardingScreen } from '../features/patients/PatientOnboardingScreen';
import { PatientWorkspace } from '../design/mobile/PatientWorkspace';

interface PatientAppProps {
  repository: DentalRepository;
  displayName: string | null;
  email: string | null;
  storageScope: string;
  onSignOut?: () => Promise<void>;
}

function errorMessage(_error: unknown, fallback: string): string { return fallback; }

export function PatientApp({ repository, displayName, email, storageScope, onSignOut }: PatientAppProps) {
  const [teeth, setTeeth] = useState<readonly PatientTooth[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [events, setEvents] = useState<readonly ClinicalEvent[] | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<readonly ClinicalSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<readonly DentalAppointment[] | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const loadedTeeth = await repository.listPermanentTeeth();
        if (!mounted) return;
        setTeeth(loadedTeeth);

        const [eventsResult, sessionsResult, appointmentsResult] = await Promise.allSettled([
          repository.listClinicalEvents(),
          repository.listSessions(),
          repository.listAppointments(),
        ]);
        if (!mounted) return;

        if (eventsResult.status === 'fulfilled') { setEvents(eventsResult.value); setEventsError(null); }
        else setEventsError(errorMessage(eventsResult.reason, 'No fue posible cargar el historial.'));

        if (sessionsResult.status === 'fulfilled') { setSessions(sessionsResult.value); setSessionsError(null); }
        else setSessionsError(errorMessage(sessionsResult.reason, 'No fue posible cargar las atenciones.'));
        if (appointmentsResult.status === 'fulfilled') { setAppointments(appointmentsResult.value); setAppointmentsError(null); }
        else setAppointmentsError(errorMessage(appointmentsResult.reason, 'No fue posible cargar las citas.'));
      } catch (error) {
        if (mounted) {
          if (error instanceof PatientProfileMissingError) setOnboardingRequired(true);
          else setLoadError(errorMessage(error, 'No fue posible cargar el odontograma.'));
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [repository, reloadKey]);

  const createInitialPatient = async (input: InitialPatientInput) => {
    await repository.createInitialPatient(input);
    setOnboardingRequired(false);
    setTeeth(null);
    setLoadError(null);
    setReloadKey((value) => value + 1);
  };

  if (onboardingRequired) {
    return (
      <PatientOnboardingScreen
        onSubmit={createInitialPatient}
        {...(onSignOut ? { onSignOut } : {})}
      />
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.loadError}>{loadError}</Text>
      </View>
    );
  }
  if (!teeth || (!events && !eventsError) || (!appointments && !appointmentsError)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Cargando ficha dental" color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Cargando tu ficha dental…</Text>
      </View>
    );
  }

  return (
    <PatientWorkspace
      storageScope={storageScope}
      displayName={displayName}
      email={email}
      appointments={appointments}
      appointmentsError={appointmentsError}
      events={events}
      eventsError={eventsError}
      repository={repository}
      sessions={sessions}
      sessionsError={sessionsError}
      onSessionSaved={() => setReloadKey((value) => value + 1)}
      teeth={teeth}
      onToothUpdated={(updated) => setTeeth((current) => current?.map((tooth) => tooth.id === updated.id ? updated : tooth) ?? null)}
      {...(onSignOut ? { onSignOut } : {})}
    />
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  loadingText: { color: colors.muted, fontSize: 12, marginTop: 10 },
  loadError: { color: colors.urgent, fontSize: 14, lineHeight: 21, maxWidth: 460, textAlign: 'center' },
});
