import type { ToothStatus } from '../../domain/teeth/types';
import { colors } from '../../ui/theme';

export const statusPresentation: Record<
  ToothStatus,
  { label: string; shortLabel: string; color: string; symbol: string }
> = {
  healthy: { label: 'Sin hallazgos', shortLabel: 'S', color: colors.healthy, symbol: '✓' },
  observation: { label: 'En observación', shortLabel: 'O', color: colors.observation, symbol: '!' },
  in_treatment: { label: 'En tratamiento', shortLabel: 'T', color: colors.treatment, symbol: '●' },
  urgent: { label: 'Prioridad alta', shortLabel: 'U', color: colors.urgent, symbol: '!' },
  missing: { label: 'Ausente', shortLabel: 'A', color: colors.missing, symbol: '×' },
};
