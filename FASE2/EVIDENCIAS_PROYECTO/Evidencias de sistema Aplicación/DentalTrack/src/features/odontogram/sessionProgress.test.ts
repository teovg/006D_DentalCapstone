import { describe, expect, it } from 'vitest';
import { sessionProgress } from './sessionProgress';

describe('session progress copy', () => {
  it('does not show a question mark when the total is unknown', () => {
    expect(sessionProgress(0, null)).toBe('Sin sesiones registradas');
    expect(sessionProgress(1, null)).toBe('1 sesión registrada');
    expect(sessionProgress(2, null)).toBe('2 sesiones registradas');
  });
  it('handles a single planned session and known totals', () => {
    expect(sessionProgress(1, 1)).toBe('1 de 1 sesión registrada');
    expect(sessionProgress(2, 3)).toBe('2 de 3 sesiones registradas');
  });
});
