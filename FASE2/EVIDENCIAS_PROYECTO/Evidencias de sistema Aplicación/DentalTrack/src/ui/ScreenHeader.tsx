import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from './theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  compact?: boolean;
}

export function ScreenHeader({ eyebrow, title, description, compact = false }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={compact ? styles.compactTitle : styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 4, gap: 8 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '500' },
  title: { ...typography.pageTitle },
  compactTitle: { ...typography.taskTitle },
  description: { ...typography.body },
});
