import { StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from './AppPressable';
import type { AppRoute } from '../app/navigation';
import { Icon } from './Icon';
import { colors } from './theme';
import { accountInitial } from '../app/accountPresentation';

interface PatientHeaderProps {
  displayName: string | null;
  isHome: boolean;
  onNavigate: (route: AppRoute) => void;
}

export function PatientHeader({ displayName, isHome, onNavigate }: PatientHeaderProps) {
  return (
    <View style={styles.header}>
      {isHome ? (
        <View style={styles.brand}><Icon name="tooth" size={20} color={colors.primary} /><Text style={styles.brandText}>DentalTrack</Text></View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar perfil dental" onPress={() => onNavigate('patient-selector')} style={({ pressed }) => [styles.patient, pressed && styles.pressed]}>
          <Icon name="tooth" size={20} color={colors.primary} /><Text style={styles.patientText}>Mi perfil dental</Text>
        </Pressable>
      )}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir notificaciones" onPress={() => onNavigate('notifications')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><Icon name="bell" size={22} color={colors.muted} /></Pressable>
        {isHome ? <Pressable accessibilityRole="button" accessibilityLabel="Seleccionar perfil dental" onPress={() => onNavigate('patient-selector')} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><View style={styles.avatar}>{displayName ? <Text style={styles.initial}>{accountInitial(displayName)}</Text> : <Icon name="user" size={20} color={colors.avatarInk} />}</View></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  brand: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  brandText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  patient: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, minHeight: 48 },
  patientText: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  iconButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48, borderRadius: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 17, backgroundColor: colors.avatar },
  initial: { color: colors.avatarInk, fontWeight: '600', fontSize: 15 },
  pressed: { opacity: 0.6, backgroundColor: colors.surfaceMuted },
});
