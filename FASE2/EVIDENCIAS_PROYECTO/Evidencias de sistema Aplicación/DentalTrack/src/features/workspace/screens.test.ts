import { describe, expect, it } from 'vitest';
import { isAppTab, rootTabForRoute } from '../../app/navigation';
import { isWorkspaceRoute, workspaceDefinition, workspaceScreens } from './screens';

describe('base screen map', () => {
  it('has valid parents and links for every screen', () => {
    for (const route of Object.keys(workspaceScreens)) {
      expect(isWorkspaceRoute(route)).toBe(true);
      if (!isWorkspaceRoute(route)) throw new Error('Invalid route');
      const screen = workspaceDefinition(route);
      expect(isAppTab(rootTabForRoute(route))).toBe(true);
      expect(screen.title.length).toBeGreaterThan(0);
      for (const link of screen.links ?? []) expect(isWorkspaceRoute(link.to)).toBe(true);
    }
  });
  it('makes every base screen reachable from the shell', () => {
    const reachable = new Set<string>();
    const visit = (route: string) => {
      if (reachable.has(route) || !isWorkspaceRoute(route)) return;
      reachable.add(route);
      for (const link of workspaceDefinition(route).links ?? []) visit(link.to);
    };
    ['notifications', 'patient-selector', 'appointment-form', 'session-form', 'reminder-form', 'treatment-detail', 'event-detail', 'document-type', 'budget-review', 'document-viewer', 'profile-details', 'dental-preferences', 'notification-preferences', 'privacy', 'plan-benefits', 'family'].forEach(visit);
    expect([...reachable].sort()).toEqual(Object.keys(workspaceScreens).sort());
  });
  it('keeps base forms in the prototype layer, not the persistence layer', () => {
    expect(workspaceDefinition('budget-review').paragraphs?.join(' ')).toContain('Sin extracción OCR');
    expect(workspaceDefinition('family-form').paragraphs?.join(' ')).toContain('no crea un paciente');
    expect(isWorkspaceRoute('unknown-route')).toBe(false);
  });
  it('retira destinos conversacionales y conserva las gestiones manuales', () => {
    for (const route of ['assistant', 'assistant-question', 'assistant-sources', 'assistant-proposal']) expect(isWorkspaceRoute(route)).toBe(false);
    for (const route of ['appointment-form', 'session-form', 'reminder-form']) expect(isWorkspaceRoute(route)).toBe(true);
  });
});
