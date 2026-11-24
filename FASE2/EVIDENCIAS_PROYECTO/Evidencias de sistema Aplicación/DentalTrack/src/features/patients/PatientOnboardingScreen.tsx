import { useState } from 'react';
import { DatePicker } from 'panelui-native/components/date-picker';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import type { InitialPatientInput } from '../../core/data/DentalRepository';
import { colors, typography, uiStyles } from '../../ui/accessTheme';
import { FormPage } from '../../ui/FormPage';

interface PatientOnboardingScreenProps {
  onSubmit: (input: InitialPatientInput) => Promise<void>;
  onSignOut?: () => Promise<void>;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0,4)) && date.getMonth()+1 === Number(value.slice(5,7)) && date.getDate() === Number(value.slice(8,10)) && value <= new Date().toISOString().slice(0, 10);
}

export function PatientOnboardingScreen({ onSubmit, onSignOut }: PatientOnboardingScreenProps) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('Ingresa el nombre del paciente.');
      return;
    }
    if (cleanName.length > 80) {
      setError('El nombre del paciente debe tener como máximo 80 caracteres.');
      return;
    }
    if (!isValidDate(birthDate)) {
      setError('Selecciona una fecha de nacimiento válida.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: cleanName, birthDate });
    } catch {
      setError('No fue posible crear el perfil. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPage outerStyle={styles.background} contentContainerStyle={styles.screen}>
      <View style={styles.heroMark}><Text style={styles.heroMarkText}>DentalTrack</Text></View>
      <Text style={styles.title}>Crea tu perfil dental</Text>
      <Text style={styles.description}>
        Usaremos estos datos para preparar tu odontograma. Podrás actualizar la configuración dental más adelante.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nombre del paciente</Text>
        <TextInput
          accessibilityLabel="Nombre del paciente"
          autoCapitalize="words"
          autoComplete="name"
          editable={!submitting}
          maxLength={80}
          onChangeText={setName}
          placeholder="Ej. Camila"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>Fecha de nacimiento</Text>
        <DatePicker
          {...(birthDate ? { selected: new Date(`${birthDate}T12:00:00`) } : {})}
          onSelect={(date)=>setBirthDate(date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '')}
          maxDate={new Date()}
          captionLayout="dropdown"
          locale="es-CL"
          disabled={submitting}
          placeholder="Elegir fecha"
        />
        <Text style={styles.helper}>La fecha identifica el perfil; no determina por sí sola qué piezas están presentes.</Text>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          accessibilityState={{busy:submitting,disabled:submitting}}
          onPress={submit}
          style={({ pressed }) => [styles.button, (pressed || submitting) && styles.pressed]}
        >
          <Text style={styles.buttonText}>{submitting ? 'Creando perfil…' : 'Crear perfil y continuar'}</Text>
        </Pressable>
        {onSignOut ? (
          <Pressable accessibilityRole="button" disabled={submitting} onPress={onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Usar otra cuenta</Text>
          </Pressable>
        ) : null}
      </View>
    </FormPage>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.background },
  screen: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  heroMark: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }, heroMarkText: { color: colors.primaryDark, fontSize: 17, fontWeight: '600' },
  title: { ...typography.taskTitle }, description: { ...typography.body, marginTop: 8 },
  card: { marginTop: 24 }, label: { ...typography.label, marginBottom: 8, marginTop: 16 }, input: { ...uiStyles.input },
  helper: { ...typography.caption, marginTop: 8 }, error: { ...typography.body, color: colors.urgent, marginTop: 16 },
  button: { ...uiStyles.primaryButton, marginTop: 24 }, buttonText: { ...uiStyles.primaryButtonText }, pressed: { ...uiStyles.pressed },
  signOutButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, signOutText: { color: colors.primaryDark, fontSize: 14 },
});
