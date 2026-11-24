import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppPressable } from './AppPressable';
import { ChoiceList, type ChoiceOption } from './ChoiceList';
import { Icon } from './Icon';
import { colors, typography, uiStyles } from './theme';

interface Props<T extends string> {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChoiceField<T extends string>({ label, options, value, onChange, disabled = false }: Props<T>) {
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<View>(null);
  const selected = options.find((option) => option.id === value);
  return <View style={styles.field}>
    <AppPressable
      ref={trigger}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${selected?.label ?? value}`}
      accessibilityState={{ expanded, disabled }}
      aria-expanded={expanded}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => setExpanded((current) => !current)}
      style={styles.trigger}
    >
      {selected?.color ? <View style={[styles.statusDot, { backgroundColor: selected.color }]} /> : null}
      <Text style={styles.value}>{selected?.label ?? value}</Text>
      <View style={{ transform: [{ rotate: expanded ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={18} color={colors.primary} /></View>
    </AppPressable>
    {expanded ? <ChoiceList label={label} options={options} value={value} disabled={disabled} onChange={(next) => { onChange(next); setExpanded(false); if (Platform.OS === 'web') trigger.current?.focus(); }} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  trigger: { ...uiStyles.input, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  value: { ...typography.label, flex: 1, minWidth: 0 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
