import { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPressable } from '../../ui/AppPressable';
import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { Icon } from '../../ui/Icon';
import { colors, typography, uiStyles } from '../../ui/theme';
import { findExplanations } from './explanations';

export function TermExplanationButton({ term, label, disabled = false }: { term: string; label?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const insets = useSafeAreaInsets();
  const matches = findExplanations(term);
  const selected = matches.length === 1 ? matches[0] : matches.find(item => item.id === selection);
  const close = () => { setOpen(false); setSelection(null); setLinkError(false); };
  return <>
    <AppPressable accessibilityRole="button" accessibilityLabel={`Qué significa ${term}`} disabled={disabled || !term.trim()}
      onPress={() => setOpen(true)} style={styles.trigger}>
      <Icon name="info" size={22} color={colors.primary} />
      {label ? <Text style={uiStyles.secondaryButtonText}>{label}</Text> : null}
    </AppPressable>
    <Modal transparent visible={open} animationType="none" onRequestClose={close}>
      <View style={styles.backdrop}>
        <AppPressable accessibilityRole="button" accessibilityLabel="Cerrar explicación" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}><Text accessibilityRole="header" style={[typography.taskTitle, styles.title]}>Qué significa</Text>
            <AppPressable accessibilityRole="button" accessibilityLabel="Volver al registro" onPress={close} style={styles.trigger}><Text style={uiStyles.secondaryButtonText}>Cerrar</Text></AppPressable>
          </View>
          <IndicatedScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(24, insets.bottom + 20) }]}>
            <Text selectable style={typography.label}>{term}</Text>
            {!selected && matches.length > 1 ? <>
              <Text style={typography.body}>Hay varios conceptos en esta prestación. Elige cuál quieres entender.</Text>
              {matches.map(item => <AppPressable key={item.id} accessibilityRole="button" onPress={() => setSelection(item.id)} style={uiStyles.secondaryButton}><Text style={uiStyles.secondaryButtonText}>{item.title}</Text></AppPressable>)}
            </> : selected ? <>
              <Text accessibilityRole="header" style={typography.sectionTitle}>{selected.title}</Text>
              <Text selectable style={typography.body}>{selected.answer}</Text>
              <Text style={typography.caption}>Resumen guardado · fuente consultada el {new Date(`${selected.reviewedAt}T12:00:00`).toLocaleDateString('es-CL', { dateStyle: 'medium' })}</Text>
              <View style={styles.source}>
                <Text style={typography.label}>Fuente</Text>
                <Text style={typography.body}>{selected.source.institution} · {selected.source.title}</Text>
                <Text style={typography.caption}>Sección: {selected.source.section}{selected.source.language === 'en' ? ' · Resumen en español de una fuente en inglés' : ''}</Text>
                <AppPressable accessibilityRole="link" accessibilityLabel={`Abrir fuente: ${selected.source.institution}`} style={uiStyles.secondaryButton}
                  onPress={() => { setLinkError(false); void Linking.openURL(selected.source.url).catch(() => setLinkError(true)); }}>
                  <Text style={uiStyles.secondaryButtonText}>Leer la fuente original ↗</Text>
                </AppPressable>
                {linkError ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.urgent }]}>No se pudo abrir el enlace. Inténtalo de nuevo cuando tengas conexión.</Text> : null}
              </View>
              {matches.length > 1 ? <AppPressable accessibilityRole="button" onPress={() => setSelection(null)} style={uiStyles.secondaryButton}><Text style={uiStyles.secondaryButtonText}>Elegir otro concepto</Text></AppPressable> : null}
            </> : <Text accessibilityLiveRegion="polite" style={typography.body}>Todavía no hay una explicación verificada para este término. No se ha enviado tu documento ni se ha generado una respuesta. Puedes aclararlo con tu profesional.</Text>}
            <Text style={typography.caption}>Esta información explica un término. La evaluación de tu caso corresponde a tu profesional.</Text>
          </IndicatedScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 48, minWidth: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: { height: '80%', width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12 }, title: { flex: 1 },
  content: { padding: 20, gap: 16 }, source: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 8 },
});
