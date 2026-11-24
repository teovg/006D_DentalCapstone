import { describe, expect, it } from 'vitest';

import {
  createToothIdentity,
  findPermanentToothByFdi,
  findPermanentToothByUniversal,
  permanentTeeth,
} from './catalog';

describe('catalogo dental permanente', () => {
  it('construye 32 identidades canonicas unicas', () => {
    expect(permanentTeeth).toHaveLength(32);
    expect(new Set(permanentTeeth.map((tooth) => tooth.id)).size).toBe(32);
  });

  it('traduce la identidad canonica a FDI y Universal', () => {
    expect(createToothIdentity('maxillary', 'right', 1)).toMatchObject({
      fdi: '11',
      universal: '8',
    });
    expect(createToothIdentity('mandibular', 'left', 8)).toMatchObject({
      fdi: '38',
      universal: '17',
    });
    expect(createToothIdentity('mandibular', 'right', 1)).toMatchObject({
      fdi: '41',
      universal: '25',
    });
  });

  it('rechaza posiciones fuera de la denticion permanente', () => {
    expect(() => createToothIdentity('maxillary', 'left', 9)).toThrow(RangeError);
  });

  it('resuelve FDI y Universal hacia la misma identidad canonica', () => {
    expect(findPermanentToothByFdi('16')?.id).toBe('permanent:maxillary:right:6');
    expect(findPermanentToothByUniversal('#3')?.id).toBe('permanent:maxillary:right:6');
  });
});
