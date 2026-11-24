import { describe, expect, it } from 'vitest';

import { resolveSupabaseConfiguration } from './supabaseConfig';

describe('configuracion de persistencia', () => {
  it('usa demo local solo cuando no hay variables Supabase', () => {
    expect(resolveSupabaseConfiguration({})).toEqual({ mode: 'local-demo' });
  });

  it('prefiere la publishable key actual', () => {
    expect(
      resolveSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy',
      }),
    ).toMatchObject({ mode: 'supabase', keySource: 'publishable' });
  });

  it('admite anon key solo como compatibilidad legado', () => {
    expect(
      resolveSupabaseConfiguration({
        EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy',
      }),
    ).toMatchObject({ mode: 'supabase', keySource: 'legacy-anon' });
  });

  it('no cae silenciosamente a local con configuracion parcial', () => {
    expect(
      resolveSupabaseConfiguration({ EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co' }),
    ).toMatchObject({ mode: 'invalid' });
  });
});
