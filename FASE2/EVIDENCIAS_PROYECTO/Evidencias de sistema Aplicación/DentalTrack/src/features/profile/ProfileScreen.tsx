import { IndicatedScrollView } from '../../ui/IndicatedScrollView';
import { useState } from 'react';
import {  StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import { ScreenHeader } from '../../ui/ScreenHeader';
import { colors, typography, uiStyles } from '../../ui/theme';
import type { WorkspaceRoute } from '../workspace/screens';
import { Icon } from '../../ui/Icon';
import { accountInitial } from '../../app/accountPresentation';

interface ProfileScreenProps {
  displayName: string | null;
  email: string | null;
  onSignOut?: () => Promise<void>;
  onNavigate: (route: WorkspaceRoute) => void;
}

export function ProfileScreen({ displayName, email, onSignOut, onNavigate }: ProfileScreenProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (!onSignOut || signingOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <IndicatedScrollView contentContainerStyle={styles.content}>
      <ScreenHeader compact title="Mi perfil" />

      <View style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{accountInitial(displayName) ?? 'DT'}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.identityLabel}>{displayName ?? 'Cuenta de acceso'}</Text>
          <Text selectable style={styles.email}>{email ?? 'Sin correo asociado'}</Text>
        </View>
      </View>

      <SectionCard title="Pacientes">
        {([['profile-details', 'Datos del paciente'], ['family', 'Grupo familiar']] as const).map(([route, label]) => <Pressable accessibilityRole="button" key={route} onPress={() => onNavigate(route)} style={styles.menuRow}><Text style={styles.menuLabel}>{label}</Text><Icon name="chevron" size={18} color={colors.primary} /></Pressable>)}
      </SectionCard>
      <SectionCard title="Configuración">
        {([
          ['dental-preferences', 'Dentición y numeración'],
          ['notification-preferences', 'Notificaciones y recordatorios'], ['privacy', 'Privacidad y archivos'],
        ] as const).map(([route, label]) => <Pressable accessibilityRole="button" key={route} onPress={() => onNavigate(route)} style={styles.menuRow}><Text style={styles.menuLabel}>{label}</Text><Icon name="chevron" size={18} color={colors.primary} /></Pressable>)}
      </SectionCard>
      <SectionCard title="Tu cuenta">
        <Pressable accessibilityRole="button" onPress={() => onNavigate('plan-benefits')} style={styles.menuRow}><Text style={styles.menuLabel}>Planes Free y Premium</Text><Icon name="chevron" size={18} color={colors.primary} /></Pressable>
      </SectionCard>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !onSignOut || signingOut }}
        disabled={!onSignOut || signingOut}
        onPress={handleSignOut}
        style={({ pressed }) => [styles.signOutButton, !onSignOut && styles.signOutDisabled, (pressed || signingOut) && styles.pressed]}
      >
        <Text style={[styles.signOutText, !onSignOut && styles.signOutTextDisabled]}>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text>
      </Pressable>
    </IndicatedScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  content: { ...uiStyles.page, paddingTop: 8, gap: 16 },
  identityCard: { alignItems: 'flex-start', flexDirection: 'row', paddingVertical: 8, gap: 16 },
  avatar: { alignItems: 'center', backgroundColor: colors.avatar, borderRadius: 28, height: 56, justifyContent: 'center', width: 56, flexShrink: 0 },
  avatarText: { color: colors.avatarInk, fontSize: 20, fontWeight: '500' },
  identityCopy: { flex: 1, minWidth: 0 }, identityLabel: { ...typography.sectionTitle }, email: { ...typography.body, marginTop: 4 },
  card: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 16 },
  cardTitle: { ...typography.sectionTitle, marginBottom: 4 },
  signOutButton: { ...uiStyles.secondaryButton, borderColor: colors.urgent },
  signOutText: { ...uiStyles.secondaryButtonText, color: colors.urgent },
  signOutDisabled: { borderColor: colors.border }, signOutTextDisabled: { color: colors.muted }, pressed: { ...uiStyles.pressed },
  menuRow: { ...uiStyles.row, minHeight: 56, paddingVertical: 12 }, menuLabel: { ...typography.body, color: colors.ink, flex: 1 },
});
