import { StyleSheet, Text, View } from 'react-native';
import { AppPressable as Pressable } from '../../ui/AppPressable';

import type { PatientTooth } from '../../domain/teeth/types';
import { colors } from '../../ui/theme';
import { statusPresentation } from './toothPresentation';

interface ToothButtonProps {
  tooth: PatientTooth;
  selected: boolean;
  numbering: 'fdi' | 'universal';
  onPress: (tooth: PatientTooth) => void;
}

export function ToothButton({ tooth, selected, numbering, onPress }: ToothButtonProps) {
  const presentation = statusPresentation[tooth.status];
  const isMolar = tooth.positionFromMidline >= 6;
  const visibleNumber = numbering === 'fdi' ? tooth.fdi : tooth.universal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Pieza ${visibleNumber} en sistema ${numbering === 'fdi' ? 'FDI' : 'Universal'}, ${tooth.name}, ${presentation.label}`}
      accessibilityHint="Abre el detalle de esta pieza"
      hitSlop={6}
      onPress={() => onPress(tooth)}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <Text style={[styles.number, selected && styles.numberSelected]}>{visibleNumber}</Text>
      <View
        style={[
          styles.tooth,
          isMolar && styles.molar,
          { borderColor: presentation.color },
          selected && styles.toothSelected,
        ]}
      >
        <View style={[styles.crown, isMolar && styles.crownMolar]}>
          <View style={[styles.groove, { backgroundColor: presentation.color }]} />
        </View>
        <View style={styles.roots}>
          <View style={[styles.toothRoot, { borderColor: presentation.color }]} />
          <View style={[styles.toothRoot, { borderColor: presentation.color }]} />
        </View>
        <View style={[styles.statusMark, { backgroundColor: presentation.color }]}>
          <Text style={styles.statusMarkText}>{presentation.symbol}</Text>
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: presentation.color }]}>
        <Text style={styles.statusText}>{presentation.shortLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
  },
  pressed: { opacity: 0.62 },
  number: { color: colors.muted, fontSize: 9, fontWeight: '700', marginBottom: 3 },
  numberSelected: { color: colors.primaryDark },
  tooth: {
    alignItems: 'center',
    backgroundColor: '#FBFDFD',
    borderRadius: 8,
    borderWidth: 2,
    height: 31,
    justifyContent: 'center',
    width: 19,
    position: 'relative',
  },
  molar: { borderRadius: 7, width: 22 },
  toothSelected: {
    backgroundColor: colors.accent,
    borderWidth: 3,
    transform: [{ scale: 1.08 }],
  },
  crown: { backgroundColor: '#FFFFFF', borderRadius: 5, height: 14, marginTop: -5, width: 13 },
  crownMolar: { width: 16 },
  groove: { borderRadius: 2, height: 3, opacity: 0.7, width: 3 },
  roots: { flexDirection: 'row', gap: 2, marginTop: 1 },
  toothRoot: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, height: 8, opacity: 0.45, width: 4 },
  statusMark: { alignItems: 'center', borderRadius: 6, height: 12, justifyContent: 'center', position: 'absolute', right: -5, top: -5, width: 12 },
  statusMarkText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },
  statusPill: {
    alignItems: 'center',
    borderRadius: 8,
    height: 14,
    justifyContent: 'center',
    marginTop: 3,
    minWidth: 14,
    paddingHorizontal: 3,
  },
  statusText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
});
