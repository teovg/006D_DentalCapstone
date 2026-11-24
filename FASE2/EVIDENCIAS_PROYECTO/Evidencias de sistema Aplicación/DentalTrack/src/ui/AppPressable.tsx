import { forwardRef } from 'react';
import { Pressable, StyleSheet, type PressableProps, type View } from 'react-native';

type AppPressableProps = PressableProps & { 'aria-pressed'?: boolean };

export const AppPressable = forwardRef<View, AppPressableProps>(function AppPressable({ style, android_ripple, ...props }, ref) {
  const state = props.accessibilityState;
  return <Pressable {...props} ref={ref}
    aria-expanded={props['aria-expanded'] ?? state?.expanded}
    aria-disabled={props['aria-disabled'] ?? props.disabled ?? state?.disabled}
    aria-busy={props['aria-busy'] ?? state?.busy}
    aria-checked={props['aria-checked'] ?? state?.checked}
    aria-selected={props['aria-selected'] ?? (props.accessibilityRole === 'tab' ? state?.selected : undefined)}
    aria-pressed={props['aria-pressed'] ?? (props.accessibilityRole === 'button' ? state?.selected : undefined)}
    android_ripple={android_ripple} style={(pressedState) => [typeof style === 'function' ? style(pressedState) : style, pressedState.pressed && styles.pressed, props.disabled && styles.disabled]} />;
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.55 },
});
