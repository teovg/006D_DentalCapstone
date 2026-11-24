import { colors, fontFamilies } from './theme';
export interface TemporalInputProps { value: string; onChangeText: (value: string) => void; label: string; mode: 'date' | 'time' | 'datetime-local'; disabled?: boolean }
export function TemporalInput({ value, onChangeText, label, mode, disabled }: TemporalInputProps) {
  return <input aria-label={label} type={mode} value={value} disabled={disabled} onChange={(event) => onChangeText(event.currentTarget.value)} style={{ boxSizing: 'border-box', width: '100%', minHeight: 48, padding: 12, border: `1px solid ${colors.inputBorder}`, borderRadius: 8, background: colors.surface, color: colors.ink, fontFamily: fontFamilies.body, fontSize: 16 }} />;
}
