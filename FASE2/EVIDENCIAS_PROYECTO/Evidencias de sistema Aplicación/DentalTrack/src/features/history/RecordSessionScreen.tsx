import { TemporalInput } from '../../ui/TemporalInput';
import { useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { findPermanentToothByFdi } from '../../domain/teeth/catalog';
import type { RecordSessionInput } from '../../domain/clinical/types';
import { AppPressable } from '../../ui/AppPressable';
import { FormPage } from '../../ui/FormPage';
import { SubscreenHeader } from '../../ui/SubscreenHeader';
import { colors, typography, uiStyles } from '../../ui/theme';
import { useDirtyDraft } from '../../ui/UnsavedChanges';

const fields = [
  { key: 'date', label: 'Fecha de atención', placeholder: 'AAAA-MM-DD', length: 10 },
  { key: 'title', label: 'Procedimiento realizado', placeholder: 'Ej. Restauración', length: 140 },
  { key: 'teeth', label: 'Piezas FDI (opcional)', placeholder: 'Ej. 16, 26', length: 120 },
  { key: 'professional', label: 'Profesional (opcional)', placeholder: 'Nombre', length: 100 },
  { key: 'notes', label: 'Notas personales (opcional)', placeholder: 'Anota las indicaciones que quieres recordar.', length: 1500 },
] as const;

function localDay(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function RecordSessionScreen({ onBack, onSave }: { onBack: () => void; onSave: (input: RecordSessionInput) => Promise<void> }) {
  const [initialDate] = useState(localDay);
  const [values, setValues] = useState({ date: initialDate, title: '', teeth: '', professional: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const id = useRef<string | null>(null);
  useDirtyDraft(values.date !== initialDate || Boolean(values.title || values.teeth || values.professional || values.notes));

  const save = async () => {
    if (savingRef.current) return;
    const date = values.date.trim();
    const day = new Date(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date || date > localDay() || date < '1900-01-01') {
      setError('Ingresa una fecha válida de una atención que ya ocurrió.');
      return;
    }
    if (!values.title.trim()) { setError('Escribe el procedimiento que se realizó.'); return; }
    const toothIds: string[] = [];
    for (const code of values.teeth.trim().split(/[\s,]+/).filter(Boolean)) {
      const tooth = findPermanentToothByFdi(code);
      if (!tooth) { setError(`La pieza ${code} no es válida en la numeración FDI permanente.`); return; }
      toothIds.push(tooth.id);
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      id.current ??= randomUUID();
      await onSave({ id: id.current, date, title: values.title.trim(), professional: values.professional.trim(), notes: values.notes.trim(), toothIds: [...new Set(toothIds)] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la atención.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <FormPage contentContainerStyle={uiStyles.page}>
    <SubscreenHeader title="Registrar atención" subtitle="Anota una sesión que ya ocurrió." onBack={onBack} />
    {fields.map(({ key, label, placeholder, length }) => <View key={key} style={styles.field}>
      <Text style={typography.label}>{label}</Text>
        {key === 'date' ? <TemporalInput label={label} mode={key === 'date' ? 'date' : 'time'} value={values[key]} disabled={saving} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} /> : <TextInput accessibilityLabel={label} value={values[key]} editable={!saving} placeholder={placeholder} placeholderTextColor={colors.muted}
        maxLength={length} multiline={key === 'notes'} style={[uiStyles.input, key === 'notes' && styles.notes]}
        onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} />}
    </View>)}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <AppPressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={uiStyles.primaryButton}>
      <Text style={uiStyles.primaryButtonText}>{saving ? 'Guardando…' : 'Guardar atención'}</Text>
    </AppPressable>
  </FormPage>;
}

const styles = StyleSheet.create({
  field: { gap: 6 }, notes: { minHeight: 96, textAlignVertical: 'top' }, error: { ...typography.body, color: colors.urgent },
});
