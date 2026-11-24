import { StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from './AppPressable';

import { typography } from './theme';
import { Icon } from './Icon';

interface SubscreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function SubscreenHeader({ title, subtitle, onBack }: SubscreenHeaderProps) {
  return (
    <View><View style={styles.header}>
      <Pressable
        accessibilityLabel="Volver"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Icon name="back" />
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  backButton: { alignItems: 'center', borderRadius: 8, minHeight: 48, justifyContent: 'center', width: 48, marginLeft: -12 },
  pressed: { opacity: 0.65 },
  title: { ...typography.taskTitle, flex: 1, minWidth: 0 },
  subtitle: { ...typography.body, marginTop: 4 },
});
