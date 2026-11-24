import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

const storageKey = 'dentaltrack.password-recovery.v1';
export const invalidRecoveryMessage = 'El enlace no es válido o ha vencido. Solicita uno nuevo.';
export type RecoveryState = 'none' | 'checking' | 'ready' | 'invalid';
type RecoveryMarker = { userId: string; expiresAt: number };
type RecoveryLink = { kind: 'none' | 'return' | 'invalid' } | { kind: 'tokens'; access_token: string; refresh_token: string };

export function recoveryRedirectUrl(webUrl?: string): string {
  if (!webUrl) return 'dentaltrack://auth/recovery';
  const url = new URL(webUrl);
  url.search = '?auth=recovery';
  url.hash = '';
  return url.toString();
}

export function parseRecoveryLink(value: string | null, native = false): RecoveryLink {
  if (!value) return { kind: 'none' };
  try {
    const url = new URL(value);
    if (native && (url.protocol !== 'dentaltrack:' || url.hostname !== 'auth' || url.pathname !== '/recovery')) return { kind: 'none' };
    const params = new URLSearchParams(url.hash.slice(1));
    const recovery = native || url.searchParams.get('auth') === 'recovery' || params.get('type') === 'recovery';
    if (!recovery) return { kind: 'none' };
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (params.get('error') || params.get('error_code') || params.get('error_description')) return { kind: 'invalid' };
    if (!native && url.searchParams.get('auth') === 'recovery' && !url.hash) return { kind: 'return' };
    if (params.get('type') !== 'recovery' || !access_token || !refresh_token) return { kind: 'invalid' };
    return { kind: 'tokens', access_token, refresh_token };
  } catch {
    return { kind: 'none' };
  }
}

/** Keeps recovery ahead of patient data, including a reload while editing. Never stores link tokens. */
export class PasswordRecovery {
  private state: RecoveryState = 'none';
  private marker: RecoveryMarker | null = null;
  private listeners = new Set<() => void>();
  private initialLink: RecoveryLink;

  constructor(private client: SupabaseClient, private storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, initialUrl: string | null = null) {
    this.initialLink = parseRecoveryLink(initialUrl);
    try {
      const saved: unknown = JSON.parse(storage?.getItem(storageKey) ?? 'null');
      if (saved && typeof saved === 'object' && 'userId' in saved && typeof saved.userId === 'string' && 'expiresAt' in saved && typeof saved.expiresAt === 'number') this.marker = { userId: saved.userId, expiresAt: saved.expiresAt };
    } catch { /* Storage may be unavailable; recovery still works until reload. */ }
    if (this.initialLink.kind !== 'none' || this.marker) this.state = 'checking';
    // Subscribe at client construction, before Supabase finishes URL initialization.
    client.auth.onAuthStateChange((event, session) => this.onAuthEvent(event, session));
  }

  getSnapshot = (): RecoveryState => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private setState(state: RecoveryState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private saveMarker(marker: RecoveryMarker | null) {
    this.marker = marker;
    try {
      if (marker) this.storage?.setItem(storageKey, JSON.stringify(marker));
      else this.storage?.removeItem(storageKey);
    } catch { /* Do not turn a storage failure into a successful session. */ }
  }

  private accept(session: Session | null) {
    if (!session?.expires_at || session.expires_at * 1000 <= Date.now()) {
      this.saveMarker(null);
      this.setState('invalid');
      return;
    }
    this.saveMarker({ userId: session.user.id, expiresAt: session.expires_at });
    this.setState('ready');
  }

  private onAuthEvent(event: AuthChangeEvent, session: Session | null) {
    if (event === 'PASSWORD_RECOVERY') this.accept(session);
    else if (event === 'SIGNED_OUT' && this.state !== 'none') {
      this.saveMarker(null);
      this.setState('invalid');
    } else if (this.state === 'ready' && session && session.user.id !== this.marker?.userId) {
      this.saveMarker(null);
      this.setState('invalid');
    }
  }

  restore(session: Session | null) {
    if (this.state !== 'checking') return;
    if (this.initialLink.kind === 'tokens') {
      // URL initialization validates the user with Auth; never accept an unrelated cached session.
      if (session?.access_token === this.initialLink.access_token) this.accept(session);
      else this.setState('invalid');
    } else if ((this.initialLink.kind === 'none' || this.initialLink.kind === 'return') && this.marker && session?.user.id === this.marker.userId && this.marker.expiresAt * 1000 > Date.now()) {
      // Supabase removes the fragment after validation. The redirect query remains on reload.
      this.setState('ready');
    } else this.setState('invalid');
    this.initialLink = { kind: 'none' };
  }

  consumeNativeLink(value: string | null): Promise<void> { return this.consumeLink(value, true); }
  consumeWebLink(value: string): Promise<void> { return this.consumeLink(value, false); }

  private async consumeLink(value: string | null, native: boolean): Promise<void> {
    const link = parseRecoveryLink(value, native);
    if (link.kind === 'none' || (!native && link.kind === 'return')) return;
    this.saveMarker(null);
    this.setState('checking');
    if (link.kind !== 'tokens') { this.setState('invalid'); return; }
    try {
      const { data, error } = await this.client.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token });
      if (error) this.setState('invalid');
      else this.accept(data.session);
    } catch { this.setState('invalid'); }
  }

  async updatePassword(password: string): Promise<string | null> {
    if (this.state !== 'ready' || !this.marker || this.marker.expiresAt * 1000 <= Date.now()) {
      this.setState('invalid');
      return invalidRecoveryMessage;
    }
    try {
      const { data, error } = await this.client.auth.getUser();
      if (error && error.status !== 401 && error.status !== 403) return 'No fue posible verificar tu sesión. Revisa tu conexión y vuelve a intentar.';
      if (error || data.user?.id !== this.marker.userId) { this.setState('invalid'); return invalidRecoveryMessage; }
      const result = await this.client.auth.updateUser({ password });
      if (result.error) {
        if (result.error.code === 'weak_password') return 'La contraseña no cumple los requisitos de seguridad. Usa una más larga y combina letras, números y símbolos.';
        if (result.error.code === 'same_password') return 'Elige una contraseña diferente de la anterior.';
        if (result.error.status === 401 || result.error.status === 403) { this.setState('invalid'); return invalidRecoveryMessage; }
        return 'No fue posible cambiar la contraseña. Conservamos lo escrito para que puedas reintentar.';
      }
      return null;
    } catch { return 'No fue posible conectar. Revisa tu conexión y vuelve a intentar.'; }
  }

  complete() {
    this.initialLink = { kind: 'none' };
    this.saveMarker(null);
    this.setState('none');
  }
}

const controllers = new WeakMap<SupabaseClient, PasswordRecovery>();
export function registerPasswordRecovery(client: SupabaseClient, storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, initialUrl?: string) {
  const controller = new PasswordRecovery(client, storage, initialUrl ?? null);
  controllers.set(client, controller);
  return client;
}
export function getPasswordRecovery(client: SupabaseClient) {
  const controller = controllers.get(client);
  if (!controller) throw new Error('Password recovery was not initialized.');
  return controller;
}
