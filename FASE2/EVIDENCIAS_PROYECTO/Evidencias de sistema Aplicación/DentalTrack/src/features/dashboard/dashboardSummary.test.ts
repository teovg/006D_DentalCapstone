import { describe, expect, it } from 'vitest';

import { demoPatientTeeth } from '../../domain/teeth/catalog';
import { summarizeTeeth } from './dashboardSummary';

describe('summarizeTeeth', () => {
  it('derives dashboard totals from repository teeth', () => {
    expect(summarizeTeeth(demoPatientTeeth)).toEqual({
      total: 32,
      healthy: 28,
      observation: 1,
      treatmentOrPriority: 2,
    });
  });

  it('returns zeroes for an empty collection', () => {
    expect(summarizeTeeth([])).toEqual({
      total: 0,
      healthy: 0,
      observation: 0,
      treatmentOrPriority: 0,
    });
  });
});
