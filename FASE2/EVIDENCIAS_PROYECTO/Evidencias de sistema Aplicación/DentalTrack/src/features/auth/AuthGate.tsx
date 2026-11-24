import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';
import { colors, radii, typography, uiStyles } from '../../ui/accessTheme';
import { invalidRecoveryMessage, recoveryRedirectUrl, type PasswordRecovery, type RecoveryState } from '../../infra/supabase/passwordRecovery';
import { passwordValidation } from './authValidation';

function AuthFrame({ children, actions, error }: { children: ReactNode; actions: ReactNode; error: string | null }) {
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (!error) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [error]);
  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen} onContentSizeChange={() => { if (error) scroll.current?.scrollToEnd({ animated: false }); }}>{children}</ScrollView>
    <View style={styles.actions}>{actions}</View>
  </KeyboardAvoidingView>;
}

function AuthButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}>
    <Text style={styles.buttonText}>{busy ? 'Procesando…' : label}</Text>
  </Pressable>;
}

function PasswordVisibility({ visible, onPress, disabled }: { visible: boolean; onPress: () => void; disabled: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.visibility}><Text style={styles.recoveryText}>{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text></Pressable>;
}

function authMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  return 'No fue posible iniciar sesión. Revisa tu conexión e inténtalo nuevamente.';
}

export function AuthGate({ client, initialRecovering = false }: { client: SupabaseClient; initialRecovering?: boolean }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(initialRecovering);

  const submit = async () => {
    if (inFlight.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Ingresa un correo válido.'); return; }
    if (!recovering && !password) { setError('Ingresa tu contraseña.'); return; }
    if (!recovering && mode === 'sign-up') {
      const validation = passwordValidation(password, passwordConfirmation);
      if (validation) { setError(validation); return; }
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (recovering) {
        const redirectTo = recoveryRedirectUrl(Platform.OS === 'web' ? window.location.href : undefined);
        const result = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (result.error) setError('No fue posible solicitar el enlace. Espera un momento y vuelve a intentar.');
        else setNotice('Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña. Revisa también el correo no deseado.');
      } else if (mode === 'sign-in') {
        const result = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) setError(authMessage(result.error.message));
      } else {
        const result = await client.auth.signUp({ email: email.trim(), password });
        if (result.error) setError('No fue posible crear la cuenta. Revisa los datos e inténtalo nuevamente.');
        else if (!result.data.session) setNotice('Cuenta creada. Revisa tu correo para confirmar el acceso.');
      }
    } catch { setError('No fue posible conectar. Revisa tu conexión e inténtalo nuevamente.'); }
    finally { inFlight.current = false; setSubmitting(false); }
  };

  const switchMode = (nextMode: 'sign-in' | 'sign-up') => {
    setRecovering(false); setMode(nextMode); setError(null); setNotice(null);
    setPassword(''); setPasswordConfirmation(''); setShowPassword(false);
  };

  return <AuthFrame error={error} actions={<>
    <AuthButton label={recovering ? notice ? 'Volver a enviar enlace' : 'Enviar enlace' : mode === 'sign-in' ? 'Ingresar' : 'Crear cuenta'} busy={submitting} onPress={submit} />
    {mode === 'sign-in' ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => { setRecovering((value) => !value); setNotice(null); setError(null); setPassword(''); setShowPassword(false); }} style={styles.recovery}><Text style={styles.recoveryText}>{recovering ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}</Text></Pressable> : null}
  </>}>
    {!recovering ? <View style={styles.modeSwitch}>
      {(['sign-in', 'sign-up'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} disabled={submitting} onPress={() => switchMode(value)} style={[styles.modeButton, mode === value && styles.modeButtonActive]}><Text style={[styles.modeText, mode === value && styles.modeTextActive]}>{value === 'sign-in' ? 'Ingresar' : 'Crear cuenta'}</Text></Pressable>)}
    </View> : null}
    <Text style={styles.brand}>DentalTrack</Text>
    <Text style={styles.title}>{recovering ? 'Recuperar acceso' : mode === 'sign-in' ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>
    <Text style={styles.description}>{recovering ? 'Te enviaremos un enlace para elegir una nueva contraseña.' : mode === 'sign-in' ? 'Accede a tu odontograma e información personal.' : 'Después crearás el perfil de paciente que utilizará la aplicación.'}</Text>
    <Text style={styles.label}>Correo</Text>
    <TextInput accessibilityLabel="Correo" autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!submitting} keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={recovering ? submit : undefined} placeholder="usuario@ejemplo.cl" placeholderTextColor={colors.muted} style={styles.input} value={email} />
    {!recovering ? <>
      <Text style={styles.label}>Contraseña</Text>
      <TextInput accessibilityLabel="Contraseña" autoCapitalize="none" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} editable={!submitting} onChangeText={setPassword} onSubmitEditing={mode === 'sign-in' ? submit : undefined} placeholder="Contraseña" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={styles.input} value={password} />
      {mode === 'sign-up' ? <>
        <Text style={styles.hint}>Al menos 6 caracteres. El servicio puede exigir mayor seguridad.</Text>
        <Text style={styles.label}>Repite la contraseña</Text>
        <TextInput accessibilityLabel="Confirmación de contraseña" autoCapitalize="none" autoComplete="new-password" editable={!submitting} onChangeText={setPasswordConfirmation} onSubmitEditing={submit} placeholder="Repite tu contraseña" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={styles.input} value={passwordConfirmation} />
      </> : null}
      <PasswordVisibility visible={showPassword} disabled={submitting} onPress={() => setShowPassword((value) => !value)} />
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
  </AuthFrame>;
}

export function ResetPassword({ recovery, state, onExit, onComplete }: { recovery: PasswordRecovery; state: RecoveryState; onExit: (requestNew: boolean) => Promise<void>; onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const invalid = state === 'invalid';

  const submit = async () => {
    if (inFlight.current) return;
    const validation = passwordValidation(password, confirmation);
    if (validation) { setError(validation); return; }
    inFlight.current = true; setSubmitting(true); setError(null);
    try {
      const failure = await recovery.updatePassword(password);
      if (failure) setError(failure);
      else { setSaved(true); setPassword(''); setConfirmation(''); }
    } finally { inFlight.current = false; setSubmitting(false); }
  };
  const exit = async (requestNew: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true; setSubmitting(true); setError(null);
    try { await onExit(requestNew); }
    catch { setError('No fue posible cerrar la sesión de recuperación. Intenta nuevamente.'); }
    finally { inFlight.current = false; setSubmitting(false); }
  };

  return <AuthFrame error={error} actions={<>
    <AuthButton label={saved ? 'Continuar' : invalid ? 'Solicitar otro enlace' : 'Guardar nueva contraseña'} busy={submitting} onPress={saved ? onComplete : invalid ? () => exit(true) : submit} />
    {!saved ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => exit(false)} style={styles.recovery}><Text style={styles.recoveryText}>Volver a iniciar sesión</Text></Pressable> : null}
  </>}>
    <Text style={styles.brand}>DentalTrack</Text>
    <Text style={styles.title}>{saved ? 'Contraseña actualizada' : invalid ? 'Repite la recuperación' : 'Elige una nueva contraseña'}</Text>
    <Text style={styles.description}>{saved ? 'Ya puedes continuar a tu información personal.' : invalid ? invalidRecoveryMessage : 'Al menos 6 caracteres. Usa una contraseña que no utilices en otras cuentas.'}</Text>
    {!invalid && !saved ? <>
      <Text style={styles.label}>Nueva contraseña</Text>
      <TextInput accessibilityLabel="Nueva contraseña" autoCapitalize="none" autoComplete="new-password" editable={!submitting} onChangeText={setPassword} placeholder="Nueva contraseña" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={styles.input} value={password} />
      <Text style={styles.label}>Repite la contraseña</Text>
      <TextInput accessibilityLabel="Confirmación de nueva contraseña" autoCapitalize="none" autoComplete="new-password" editable={!submitting} onChangeText={setConfirmation} onSubmitEditing={submit} placeholder="Repite tu contraseña" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} style={styles.input} value={confirmation} />
      <PasswordVisibility visible={showPassword} disabled={submitting} onPress={() => setShowPassword((value) => !value)} />
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </AuthFrame>;
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.background }, screen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  actions: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20, backgroundColor: colors.background },
  brand: { color: colors.primaryDark, fontSize: 17, fontWeight: '600', marginBottom: 16 },
  modeSwitch: { flexDirection: 'row', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  modeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeButtonActive: { borderBottomColor: colors.primary }, modeText: { color: colors.muted, fontSize: 14, fontWeight: '500' }, modeTextActive: { color: colors.primaryDark },
  title: { ...typography.taskTitle }, description: { ...typography.body, marginTop: 8, marginBottom: 8 }, hint: { ...typography.body, marginTop: 8 },
  label: { ...typography.label, marginBottom: 8, marginTop: 16 }, input: { ...uiStyles.input },
  error: { ...typography.body, color: colors.urgent, marginTop: 16 },
  notice: { backgroundColor: colors.successSoft, borderRadius: radii.sm, color: colors.ink, fontSize: 14, lineHeight: 22, marginTop: 16, padding: 16 },
  button: { ...uiStyles.primaryButton }, buttonPressed: { ...uiStyles.pressed }, buttonText: { ...uiStyles.primaryButtonText },
  visibility: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-start', marginTop: 4 },
  recovery: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, recoveryText: { color: colors.primaryDark, fontSize: 14 },
});
