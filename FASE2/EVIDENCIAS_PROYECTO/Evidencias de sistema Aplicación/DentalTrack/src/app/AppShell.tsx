import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { supabaseConfiguration } from '../config/supabaseConfig';
import {
  clearDentalRepositorySession,
  dentalRepository,
  supabaseClient,
} from '../core/data/repository';
import { AuthGate, ResetPassword } from '../features/auth/AuthGate';
import { getPasswordRecovery, parseRecoveryLink, type RecoveryState } from '../infra/supabase/passwordRecovery';
import { colors } from '../ui/theme';
import { PatientApp } from './PatientApp';
import { accountDisplayName } from './accountPresentation';

const passwordRecovery = supabaseClient ? getPasswordRecovery(supabaseClient) : null;
const noRecoverySubscription = () => () => {};
const noRecoverySnapshot = (): RecoveryState => 'none';

export function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfiguration.mode === 'supabase');
  const [authError, setAuthError] = useState<string | null>(null);
  const [requestRecovery, setRequestRecovery] = useState(false);
  const recoveryState = useSyncExternalStore(passwordRecovery?.subscribe ?? noRecoverySubscription, passwordRecovery?.getSnapshot ?? noRecoverySnapshot);

  useEffect(() => {
    if (supabaseConfiguration.mode !== 'supabase' || !supabaseClient) return;
    const client = supabaseClient;
    let mounted = true;
    let initialized = false;
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        clearDentalRepositorySession();
        setSession(nextSession);
        setAuthError(null);
        if (initialized) setAuthLoading(false);
      }
    });
    const links = Platform.OS !== 'web' ? Linking.addEventListener('url', ({ url }) => { void passwordRecovery?.consumeNativeLink(url); }) : null;
    const webLink = () => {
      const incoming = window.location.href;
      const link = parseRecoveryLink(incoming);
      if (link.kind !== 'tokens' && link.kind !== 'invalid') return;
      void passwordRecovery?.consumeWebLink(incoming).then(() => {
        if (window.location.href !== incoming) return;
        const url = new URL(incoming);
        url.hash = '';
        window.history.replaceState(window.history.state, '', url.toString());
      });
    };
    if (Platform.OS === 'web') window.addEventListener('hashchange', webLink);
    const restore = async () => {
      try {
        if (Platform.OS !== 'web') await passwordRecovery?.consumeNativeLink(await Linking.getInitialURL());
        const { data, error } = await client.auth.getSession();
        if (!mounted) return;
        if (error) setAuthError('No fue posible restaurar tu sesión.');
        passwordRecovery?.restore(error ? null : data.session);
        setSession(error ? null : data.session);
      } catch {
        if (!mounted) return;
        passwordRecovery?.restore(null);
        setSession(null);
        setAuthError('No fue posible restaurar tu sesión.');
      } finally {
        initialized = true;
        if (mounted) setAuthLoading(false);
      }
    };
    void restore();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      links?.remove();
      if (Platform.OS === 'web') window.removeEventListener('hashchange', webLink);
    };
  }, []);

  const completeRecovery = () => {
    if (Platform.OS === 'web') {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
    }
    passwordRecovery?.complete();
  };

  const exitRecovery = async (requestNew: boolean) => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) throw error;
    setRequestRecovery(requestNew);
    completeRecovery();
  };

  const signOut = async () => {
    if (!supabaseClient) return;
    setAuthError(null);
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) setAuthError('No fue posible cerrar la sesión local. Intenta nuevamente.');
  };

  const content = (() => {
    if (supabaseConfiguration.mode === 'invalid') {
      return <Text accessibilityRole="alert" style={styles.loadError}>{supabaseConfiguration.message}</Text>;
    }
    if (authLoading || recoveryState === 'checking') {
      return <ActivityIndicator accessibilityLabel="Restaurando sesión" color={colors.primary} size="large" />;
    }
    if (supabaseClient && passwordRecovery && recoveryState !== 'none') {
      return <ResetPassword key={recoveryState} recovery={passwordRecovery} state={recoveryState} onExit={exitRecovery} onComplete={completeRecovery} />;
    }
    if (supabaseConfiguration.mode === 'supabase' && supabaseClient && !session) {
      return (
        <View style={styles.authContainer}>
          {authError ? <Text accessibilityRole="alert" style={styles.authError}>{authError}</Text> : null}
          <AuthGate client={supabaseClient} key={requestRecovery ? 'recover' : 'login'} initialRecovering={requestRecovery} />
        </View>
      );
    }
    if (!dentalRepository) {
      return <Text accessibilityRole="alert" style={styles.loadError}>No pudimos cargar la aplicación.</Text>;
    }
    return (
      <PatientApp
        storageScope={session?.user.id ?? 'local-demo'}
        displayName={accountDisplayName(session?.user.user_metadata.display_name)}
        email={session?.user.email ?? null}
        key={session?.user.id ?? 'local-demo'}
        repository={dentalRepository}
        {...(session && supabaseClient ? { onSignOut: signOut } : {})}
      />
    );
  })();

  return (
    <SafeAreaProvider><SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        {authError && session ? <Text accessibilityRole="alert" style={styles.inlineError}>{authError}</Text> : null}
        <View style={styles.content}>{content}</View>
      </View>
    </SafeAreaView></SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  frame: { alignSelf: 'center', backgroundColor: colors.background, flex: 1, maxWidth: 720, width: '100%' },
  content: { flex: 1, justifyContent: 'center' },
  loadError: { color: colors.urgent, fontSize: 14, lineHeight: 21, padding: 24 },
  inlineError: { backgroundColor: colors.dangerSoft, color: colors.urgent, fontSize: 14, lineHeight: 22, paddingHorizontal: 20, paddingVertical: 12 },
  authContainer: { flex: 1 },
  authError: { backgroundColor: colors.dangerSoft, color: colors.urgent, fontSize: 14, lineHeight: 22, paddingHorizontal: 20, paddingVertical: 12 },
});
