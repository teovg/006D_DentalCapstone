import { describe, expect, it } from 'vitest';
import { accountDisplayName, accountInitial } from './accountPresentation';

describe('account display name', () => {
  it('uses the supplied name without inventing a patient identity', () => {
    expect(accountDisplayName('Leo')).toBe('Leo');
  });
  it('normalizes accidental whitespace', () => {
    expect(accountDisplayName('  Leo   Gutierrez  ')).toBe('Leo Gutierrez');
  });
  it('does not substitute names for missing or invalid metadata', () => {
    for (const value of [undefined, null, '', '   ', 14, {}]) {
      expect(accountDisplayName(value)).toBeNull();
    }
  });
  it('preserves graphemes and missing-name fallbacks in avatars', () => {
    expect(accountInitial('🦊 Fox')).toBe('🦊');
    expect(accountInitial('👩🏽‍💻 Persona de prueba')).toBe('👩🏽‍💻');
    expect(accountInitial('Ólafur')).toBe('Ó');
    expect(accountInitial('J')).toBe('J');
    expect(accountInitial(null)).toBeNull();
  });
});
