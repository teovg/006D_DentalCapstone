import { Platform, StyleSheet } from 'react-native';

export const colors = {
  ink: '#173C45',
  muted: '#52696E',
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceMuted: '#E8EEEA',
  border: '#CBD7D5',
  primary: '#176C82',
  primaryDark: '#173C45',
  accent: '#DCEBE8',
  primarySoft: '#CBDDD8',
  featureInk: '#173C45',
  inputBorder: '#82999E',
  avatar: '#EAB0A0',
  avatarInk: '#643426',
  scrim: 'rgba(23,60,69,0.45)',
  successSoft: '#E7F7F0',
  warningSoft: '#FFF4DF',
  dangerSoft: '#FDEBEC',
  healthy: '#18976F',
  observation: '#C98216',
  treatment: '#2672C9',
  urgent: '#C84444',
  missing: '#7D8B90',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontFamilies = {
  body: Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : undefined,
  editorial: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia', default: 'serif' }),
} as const;

export const typography = StyleSheet.create({
  pageTitle: { color: colors.ink, fontFamily: fontFamilies.editorial, fontSize: 32, fontWeight: '400', lineHeight: 40 },
  taskTitle: { color: colors.ink, fontFamily: fontFamilies.body, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  sectionTitle: { color: colors.ink, fontFamily: fontFamilies.body, fontSize: 17, fontWeight: '600', lineHeight: 24 },
  body: { color: colors.muted, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 22 },
  label: { color: colors.ink, fontFamily: fontFamilies.body, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  caption: { color: colors.muted, fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18 },
});

export const uiStyles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 24 },
  input: { minHeight: 48, backgroundColor: colors.surface, borderColor: colors.inputBorder, borderWidth: 1, borderRadius: radii.sm, color: colors.ink, fontFamily: fontFamilies.body, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12 },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: colors.surface, fontFamily: fontFamilies.body, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderColor: colors.primary, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: colors.primaryDark, fontFamily: fontFamilies.body, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { minHeight: 48, justifyContent: 'center', borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.primary },
  pressed: { opacity: 0.65 },
});
