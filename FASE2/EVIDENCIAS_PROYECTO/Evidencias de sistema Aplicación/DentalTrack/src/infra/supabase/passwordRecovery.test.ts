import { createClient, type AuthChangeEvent, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordRecovery, invalidRecoveryMessage, parseRecoveryLink, recoveryRedirectUrl } from './passwordRecovery';
import { passwordValidation } from '../../features/auth/authValidation';

const link = 'https://app.example/?auth=recovery#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh';
function fixture(saved?: string) {
  let callback: (event: AuthChangeEvent, session: Session | null) => void = () => {};
  const session = { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'synthetic-user' } } as Session;
  const auth = {
    onAuthStateChange: vi.fn((listener: typeof callback) => { callback = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
    setSession: vi.fn(async () => ({ data: { session }, error: null as null | { message: string } })),
    getUser: vi.fn(async () => ({ data: { user: session.user }, error: null as null | { message: string } })),
    updateUser: vi.fn(async () => ({ data: { user: session.user }, error: null as null | { code?: string; status?: number } })),
  };
  const values = new Map<string, string>(saved ? [['dentaltrack.password-recovery.v1', saved]] : []);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  return { auth, client: { auth } as unknown as SupabaseClient, session, storage, values, event: (event: AuthChangeEvent, next: Session | null = session) => callback(event, next) };
}

afterEach(() => { vi.useRealTimers(); });

describe('password recovery trust boundaries', () => {
  it('builds redirects without previous query parameters or tokens', () => {
    expect(recoveryRedirectUrl()).toBe('dentaltrack://auth/recovery');
    expect(recoveryRedirectUrl('https://app.example/subpath?patient=private#token=private')).toBe('https://app.example/subpath?auth=recovery');
  });
  it('accepts only complete recovery callbacks and the registered native destination', () => {
    expect(parseRecoveryLink(link).kind).toBe('tokens');
    expect(parseRecoveryLink(link.replace('https://app.example/?auth=recovery', 'dentaltrack://auth/recovery'), true).kind).toBe('tokens');
    expect(parseRecoveryLink('dentaltrack://other/recovery#type=recovery&access_token=a&refresh_token=b', true).kind).toBe('none');
    expect(parseRecoveryLink('https://app.example/#type=signup&access_token=a&refresh_token=b').kind).toBe('none');
    expect(parseRecoveryLink('https://app.example/?auth=recovery#error_code=otp_expired').kind).toBe('invalid');
    expect(parseRecoveryLink('https://app.example/?auth=recovery#type=recovery&access_token=a').kind).toBe('invalid');
    expect(parseRecoveryLink('https://app.example/?auth=recovery').kind).toBe('return');
  });
  it('blocks an unrelated cached account when processing a web callback', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    recovery.restore({ ...f.session, access_token: 'unrelated-cached-token' });
    expect(recovery.getSnapshot()).toBe('invalid');
    expect(await recovery.updatePassword('synthetic-password')).toBe(invalidRecoveryMessage);
    expect(f.auth.updateUser).not.toHaveBeenCalled();
  });
  it('captures PASSWORD_RECOVERY before mounting UI and persists only its nonsecret boundary', () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    f.event('PASSWORD_RECOVERY');
    expect(recovery.getSnapshot()).toBe('ready');
    expect([...f.values.values()]).toEqual([JSON.stringify({ userId: f.session.user.id, expiresAt: f.session.expires_at })]);
    recovery.complete();
    expect(recovery.getSnapshot()).toBe('none');
    expect(f.values.size).toBe(0);
  });
  it('recognizes the validated callback even if the SDK event is scheduled after getSession', () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    recovery.restore(f.session);
    expect(recovery.getSnapshot()).toBe('ready');
  });
  it('keeps the reset route on reload only for the same account before the original expiry', () => {
    const f = fixture();
    new PasswordRecovery(f.client, f.storage, link).restore(f.session);
    const restored = new PasswordRecovery(f.client, f.storage, 'https://app.example/?auth=recovery');
    restored.restore(f.session);
    expect(restored.getSnapshot()).toBe('ready');
    const wrongAccount = new PasswordRecovery(f.client, f.storage);
    wrongAccount.restore({ ...f.session, user: { ...f.session.user, id: 'other-user' } });
    expect(wrongAccount.getSnapshot()).toBe('invalid');
    vi.useFakeTimers();
    vi.setSystemTime((f.session.expires_at! + 1) * 1000);
    const expired = new PasswordRecovery(f.client, f.storage);
    expired.restore(f.session);
    expect(expired.getSnapshot()).toBe('invalid');
  });
  it('never lets a failed link inherit a previous recovery marker', () => {
    const f = fixture();
    new PasswordRecovery(f.client, f.storage, link).restore(f.session);
    const expiredLink = new PasswordRecovery(f.client, f.storage, 'https://app.example/?auth=recovery#error_code=otp_expired');
    expiredLink.restore(f.session);
    expect(expiredLink.getSnapshot()).toBe('invalid');
  });
  it('processes a second recovery link in an already open web tab', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    recovery.restore(f.session);
    await recovery.consumeWebLink('https://app.example/?auth=recovery#error_code=otp_expired');
    expect(recovery.getSnapshot()).toBe('invalid');
    await recovery.consumeWebLink(link);
    expect(recovery.getSnapshot()).toBe('ready');
    await recovery.consumeWebLink('https://app.example/?auth=recovery');
    expect(recovery.getSnapshot()).toBe('ready');
  });
  it('waits for native Auth validation and rejects a failed or malformed return', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage);
    f.auth.setSession.mockResolvedValueOnce({ data: { session: f.session }, error: { message: 'expired' } });
    await recovery.consumeNativeLink(link.replace('https://app.example/?auth=recovery', 'dentaltrack://auth/recovery'));
    expect(recovery.getSnapshot()).toBe('invalid');
    expect(f.auth.setSession).toHaveBeenCalledWith({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh' });
    await recovery.consumeNativeLink('dentaltrack://auth/recovery#error_code=otp_expired');
    expect(recovery.getSnapshot()).toBe('invalid');
    expect(f.auth.setSession).toHaveBeenCalledTimes(1);
  });
  it('changes a password only after a valid native recovery and revalidates the same user', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage);
    await recovery.consumeNativeLink(link.replace('https://app.example/?auth=recovery', 'dentaltrack://auth/recovery'));
    expect(await recovery.updatePassword('synthetic-password')).toBeNull();
    expect(f.auth.getUser).toHaveBeenCalledOnce();
    expect(f.auth.updateUser).toHaveBeenCalledWith({ password: 'synthetic-password' });
    f.auth.getUser.mockResolvedValueOnce({ data: { user: { ...f.session.user, id: 'other-user' } }, error: null });
    expect(await recovery.updatePassword('synthetic-password')).toBe(invalidRecoveryMessage);
    expect(f.auth.updateUser).toHaveBeenCalledTimes(1);
  });
  it('preserves the recovery draft route on network or policy error for retry', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    recovery.restore(f.session);
    f.auth.updateUser.mockRejectedValueOnce(new Error('offline'));
    expect(await recovery.updatePassword('synthetic-password')).toContain('conectar');
    expect(recovery.getSnapshot()).toBe('ready');
    f.auth.updateUser.mockResolvedValueOnce({ data: { user: f.session.user }, error: { code: 'weak_password' } });
    expect(await recovery.updatePassword('synthetic-password')).toContain('seguridad');
    expect(recovery.getSnapshot()).toBe('ready');
    expect(await recovery.updatePassword('synthetic-password')).toBeNull();
  });
  it('blocks signed-out, switched-account and expired sessions', async () => {
    const f = fixture();
    const recovery = new PasswordRecovery(f.client, f.storage, link);
    recovery.restore(f.session);
    f.event('SIGNED_OUT', null);
    expect(recovery.getSnapshot()).toBe('invalid');
    f.event('PASSWORD_RECOVERY');
    f.event('SIGNED_IN', { ...f.session, user: { ...f.session.user, id: 'other-user' } });
    expect(recovery.getSnapshot()).toBe('invalid');
    f.event('PASSWORD_RECOVERY');
    vi.useFakeTimers();
    vi.setSystemTime((f.session.expires_at! + 1) * 1000);
    expect(await recovery.updatePassword('synthetic-password')).toBe(invalidRecoveryMessage);
    expect(f.auth.updateUser).not.toHaveBeenCalled();
  });
  it('validates length and confirmation before any mutation', () => {
    expect(passwordValidation('short', 'short')).toContain('6 caracteres');
    expect(passwordValidation('long-enough', 'different')).toContain('no coinciden');
    expect(passwordValidation('long-enough', 'long-enough')).toBeNull();
  });
  it('uses the installed Supabase SDK for recovery email and password writes with an entirely synthetic transport', async () => {
    const requests: { url: string; method: string; body: unknown }[] = [];
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
      return new Response(JSON.stringify(url.includes('/recover') ? {} : { id: 'synthetic-user', aud: 'authenticated', role: 'authenticated', email: 'synthetic@example.invalid' }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const client = createClient('https://auth.example', 'synthetic-publishable-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: transport } });
    const result = await client.auth.resetPasswordForEmail('synthetic@example.invalid', { redirectTo: 'dentaltrack://auth/recovery' });
    expect(result.error).toBeNull();
    expect(requests[0]).toMatchObject({ method: 'POST', body: { email: 'synthetic@example.invalid' } });
    expect(new URL(requests[0]!.url).searchParams.get('redirect_to')).toBe('dentaltrack://auth/recovery');
    const encode = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${encode(JSON.stringify({ sub: 'synthetic-user', exp: Math.floor(Date.now() / 1000) + 3600 }))}.${encode('synthetic-signature')}`;
    const recovery = new PasswordRecovery(client);
    await recovery.consumeNativeLink(`dentaltrack://auth/recovery#type=recovery&access_token=${jwt}&refresh_token=synthetic-refresh`);
    expect(recovery.getSnapshot()).toBe('ready');
    expect(await recovery.updatePassword('synthetic-new-password')).toBeNull();
    expect(requests.some((request) => request.method === 'PUT' && JSON.stringify(request.body).includes('synthetic-new-password'))).toBe(true);
    expect(requests.every((request) => new URL(request.url).hostname === 'auth.example')).toBe(true);
    client.auth.stopAutoRefresh();
  });
});
