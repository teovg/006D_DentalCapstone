import { isWorkspaceRoute, workspaceDefinition, type WorkspaceRoute } from '../features/workspace/screens';

export const appTabs = ['home', 'odontogram', 'history', 'documents', 'profile'] as const;

export type AppTab = (typeof appTabs)[number];
export type AppSubroute = 'preventive-care' | 'document-capture' | WorkspaceRoute;
export type AppRoute = AppTab | AppSubroute;

export interface AppNavigationItem {
  readonly id: AppTab;
  readonly label: string;
}

export const appNavigationItems: readonly AppNavigationItem[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'odontogram', label: 'Odontograma' },
  { id: 'history', label: 'Seguimiento' },
  { id: 'documents', label: 'Documentos' },
  { id: 'profile', label: 'Perfil' },
];

export function isAppTab(value: string): value is AppTab {
  return appTabs.some((tab) => tab === value);
}

export function rootTabForRoute(route: AppRoute): AppTab {
  if (isWorkspaceRoute(route)) return workspaceDefinition(route).tab;
  if (route === 'preventive-care') return 'home';
  if (route === 'document-capture') return 'documents';
  return route;
}
