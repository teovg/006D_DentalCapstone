import type { PatientTooth } from '../../domain/teeth/types';

export interface DentalSummary {
  readonly total: number;
  readonly healthy: number;
  readonly observation: number;
  readonly treatmentOrPriority: number;
}

export function summarizeTeeth(teeth: readonly PatientTooth[]): DentalSummary {
  return teeth.reduce<DentalSummary>(
    (summary, tooth) => ({
      total: summary.total + 1,
      healthy: summary.healthy + (tooth.status === 'healthy' ? 1 : 0),
      observation: summary.observation + (tooth.status === 'observation' ? 1 : 0),
      treatmentOrPriority:
        summary.treatmentOrPriority +
        (tooth.status === 'in_treatment' || tooth.status === 'urgent' ? 1 : 0),
    }),
    { total: 0, healthy: 0, observation: 0, treatmentOrPriority: 0 },
  );
}
