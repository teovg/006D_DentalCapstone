import { StyleSheet, Text, View } from 'react-native';
import { AppPressable } from './AppPressable';
import { colors, typography } from './theme';

export interface ChoiceOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly color?: string;
  readonly description?: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChoiceList<T extends string>({ label, options, value, onChange, disabled = false }: Props<T>) {
  return <View accessibilityRole="radiogroup" accessibilityLabel={label}>
    {options.map((option) => {
      const checked = option.id === value;
      return <AppPressable
        accessibilityRole="radio"
        accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
        accessibilityState={{ checked, disabled }}
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        key={option.id}
        onPress={() => onChange(option.id)}
        style={[styles.option, checked && styles.selected]}
      >
        <View style={[styles.radio, checked && styles.checked]}>
          {checked ? <View style={styles.radioDot} /> : null}
        </View>
        <View style={styles.copy}><Text style={[styles.label, checked && styles.selectedLabel]}>{option.label}</Text>{option.description ? <Text style={styles.description}>{option.description}</Text> : null}</View>
        {option.color ? <View style={[styles.statusDot, { backgroundColor: option.color }]} /> : null}
      </AppPressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  selected: { backgroundColor: colors.accent },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  checked: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  copy: { flex: 1, minWidth: 0 }, description: { ...typography.caption, marginTop: 4 },
  label: { ...typography.body, color: colors.ink },
  selectedLabel: { fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
