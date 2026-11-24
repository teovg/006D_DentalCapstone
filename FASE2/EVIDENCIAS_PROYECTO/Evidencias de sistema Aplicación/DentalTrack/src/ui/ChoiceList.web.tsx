import { useId } from 'react';
import type { ChoiceOption } from './ChoiceList';
import { colors, fontFamilies } from './theme';

interface Props<T extends string> {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// Native radio inputs preserve Space/arrow-key behavior in the browser preview.
// Expo uses ChoiceList.tsx, not this web-only implementation, on Android/iOS.
export function ChoiceList<T extends string>({ label, options, value, onChange, disabled = false }: Props<T>) {
  const name = useId();
  return <fieldset role="radiogroup" aria-label={label} disabled={disabled} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
    {options.map((option) => {
      const checked = option.id === value;
      return <label key={option.id} style={{
        boxSizing: 'border-box', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 12px', borderBottom: `1px solid ${colors.border}`,
        background: checked ? colors.accent : 'transparent',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
        color: colors.ink, fontFamily: fontFamilies.body,
        fontSize: 14, lineHeight: '22px', fontWeight: checked ? 600 : 400,
      }}>
        <input type="radio" name={name} value={option.id} checked={checked} disabled={disabled}
          onChange={() => onChange(option.id)}
          style={{ width: 20, height: 20, margin: 0, flexShrink: 0, accentColor: colors.primary }} />
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{option.label}{option.description ? <span style={{display:'block', color:colors.muted, fontSize:12, lineHeight:'18px', fontWeight:400, marginTop:4}}>{option.description}</span> : null}</span>
        {option.color ? <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: option.color }} /> : null}
      </label>;
    })}
  </fieldset>;
}
