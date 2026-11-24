import { IndicatedScrollView } from './IndicatedScrollView';
import { KeyboardAvoidingView, Platform, StyleSheet, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

/** Native forms remain scrollable while the system keyboard is visible. */
export function FormPage({ outerStyle, ...props }: ScrollViewProps & { outerStyle?: StyleProp<ViewStyle> }) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.fill, outerStyle]}>
    <IndicatedScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" {...props} />
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 } });
