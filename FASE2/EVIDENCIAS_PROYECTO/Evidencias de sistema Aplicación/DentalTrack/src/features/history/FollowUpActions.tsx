import { useState } from 'react';
import { Text, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPressable } from '../../ui/AppPressable';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, typography } from '../../ui/theme';
import type { WorkspaceRoute } from '../workspace/screens';

const actions: readonly { label: string; icon: IconName; route: WorkspaceRoute }[] = [
  { label: 'Nueva cita', icon: 'calendar', route: 'appointment-form' },
  { label: 'Registrar atención', icon: 'documents', route: 'session-form' },
  { label: 'Recordatorio', icon: 'bell', route: 'reminder-form' },
];

export function FollowUpActions({ onSelect }: { onSelect: (route: WorkspaceRoute) => void }) {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const close = () => setVisible(false);
  return <>
    <AppPressable accessibilityRole="button" accessibilityLabel="Añadir a Seguimiento"
      accessibilityHint="Abre opciones para una cita, atención o recordatorio"
      accessibilityState={{ expanded: visible }} aria-expanded={visible}
      onPress={() => setVisible(true)} style={styles.fab}>
      <Icon name="plus" size={28} color={colors.surface} />
    </AppPressable>
    <Modal accessibilityLabel="Añadir a Seguimiento" visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <AppPressable accessibilityRole="button" accessibilityLabel="Cerrar opciones de seguimiento" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <ScrollView contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Añadir a Seguimiento</Text>
              <AppPressable accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={close} style={styles.close}>
                <Text style={styles.closeLabel}>Cerrar</Text>
              </AppPressable>
            </View>
            {actions.map((action) => <AppPressable key={action.route} accessibilityRole="button"
              onPress={() => { close(); onSelect(action.route); }} style={styles.action}>
              <Icon name={action.icon} size={22} color={colors.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Icon name="chevron" size={18} color={colors.primary} />
            </AppPressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 20, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 3, boxShadow: "0 3px 6px rgba(16,36,62,0.16)" },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 720, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  sheetContent: { padding: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  title: { ...typography.sectionTitle, flex: 1, minWidth: 0 },
  close: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  closeLabel: { ...typography.label, color: colors.primaryDark },
  action: { minHeight: 64, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
  actionLabel: { ...typography.label, flex: 1, minWidth: 0 },
});
