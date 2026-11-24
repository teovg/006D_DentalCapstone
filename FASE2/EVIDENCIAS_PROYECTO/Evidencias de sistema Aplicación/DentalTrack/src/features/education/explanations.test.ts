import { describe, expect, it } from 'vitest';
import { findExplanations } from './explanations';
import explanations from './verifiedExplanations.json';

describe('explicación desde el nombre de una prestación', () => {
  it('reconoce etiquetas de presupuesto sin exigir una pregunta de chat', () => {
    expect(findExplanations('[8.20.4] RESTAURACIONES CLASE II DOS CARAS RESINA').map(item => item.id)).toEqual(['restauracion']);
    expect(findExplanations('APLICACIÓN FLÚOR BARNIZ SILANO TOTAL').map(item => item.id)).toEqual(['fluor']);
    expect(findExplanations('Cierre de diastema por pieza')[0]?.id).toBe('diastema');
    expect(findExplanations('Tratamiento de conductos')[0]?.id).toBe('endodoncia');
  });

  it('conserva la ambigüedad y no inventa una explicación fuera de cobertura', () => {
    expect(findExplanations('Endodoncia y corona').map(item => item.id)).toEqual(['endodoncia', 'corona']);
    expect(findExplanations('Coronación')).toEqual([]);
    expect(findExplanations('¿Cuál es mi próxima cita?')).toEqual([]);
    expect(findExplanations('Amoxicilina: ¿qué dosis tomo?')).toEqual([]);
    expect(findExplanations('')).toEqual([]);
  });

  it('exige fuentes HTTPS identificables y revisión fechada en el material guardado', () => {
    for (const item of explanations) {
      const url = new URL(item.source.url);
      expect(url.protocol).toBe('https:');
      expect(url.username + url.password + url.search).toBe('');
      expect(item.source.institution.length).toBeGreaterThan(0);
      expect(item.source.section.length).toBeGreaterThan(0);
      expect(item.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
