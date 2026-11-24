import { StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../ui/AppPressable';

import { colors } from '../ui/theme';
import { Icon, type IconName } from '../ui/Icon';
import { appNavigationItems, type AppTab } from './navigation';

interface BottomNavigationProps {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
}

export function BottomNavigation({ activeTab, onSelect }: BottomNavigationProps) {
  const icons: Record<AppTab, IconName> = { home: 'home', odontogram: 'tooth', history: 'calendar', documents: 'documents', profile: 'user' };
  const visibleLabels: Record<AppTab, string> = { home: 'Inicio', odontogram: 'Odonto\u00adgrama', history: 'Segui\u00admiento', documents: 'Docu\u00admentos', profile: 'Perfil' };
  return (
    <View accessibilityLabel="Navegación principal" style={styles.container}>
      {appNavigationItems.map((item) => {
        const selected = activeTab === item.id;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.iconPill, selected && styles.iconPillSelected]}>
              <Icon name={icons[item.id]} size={23} color={selected ? colors.primary : colors.muted} />
            </View>
            <Text style={[styles.label, selected && styles.selectedText]}>
              {visibleLabels[item.id]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  item: { alignItems: 'center', flex: 1, minWidth: 0, minHeight: 52 },
  pressed: { opacity: 0.62 },
  iconPill: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 46,
  },
  iconPillSelected: { backgroundColor: colors.accent },
  label: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', fontWeight: '500', marginTop: 4, maxWidth: '100%' },
  selectedText: { color: colors.primary },
});
