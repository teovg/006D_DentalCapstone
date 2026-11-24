import { colors as baseColors, typography as baseTypography, uiStyles as baseStyles } from './theme';

export { radii } from './theme';

// Access keeps its existing composition and metrics while adopting Guía personal.
export const colors = {
  ...baseColors,
  background: '#f6f4ef',
  ink: '#173c45',
  muted: '#52696e',
  primary: '#176c82',
  primaryDark: '#176c82',
  border: '#cbd7d5',
  inputBorder: '#82999e',
  successSoft: '#dcebe8',
  urgent: '#b42332',
};

export const typography = {
  ...baseTypography,
  taskTitle: { ...baseTypography.taskTitle, color: colors.ink },
  body: { ...baseTypography.body, color: colors.muted },
  label: { ...baseTypography.label, color: colors.ink },
  caption: { ...baseTypography.caption, color: colors.muted },
};

export const uiStyles = {
  ...baseStyles,
  input: { ...baseStyles.input, color: colors.ink, borderColor: colors.inputBorder },
  primaryButton: { ...baseStyles.primaryButton, backgroundColor: colors.primary },
};
