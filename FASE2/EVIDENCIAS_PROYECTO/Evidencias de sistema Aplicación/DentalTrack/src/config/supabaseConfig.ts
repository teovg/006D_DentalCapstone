export type SupabaseRuntimeConfiguration =
  | { mode: 'local-demo' }
  | {
      mode: 'supabase';
      url: string;
      publishableKey: string;
      keySource: 'publishable' | 'legacy-anon';
    }
  | { mode: 'invalid'; message: string };

interface PublicEnvironment {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
}

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

export function resolveSupabaseConfiguration(
  environment: PublicEnvironment,
): SupabaseRuntimeConfiguration {
  const url = clean(environment.EXPO_PUBLIC_SUPABASE_URL);
  const publishableKey = clean(environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const legacyAnonKey = clean(environment.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const selectedKey = publishableKey ?? legacyAnonKey;

  if (!url && !selectedKey) return { mode: 'local-demo' };
  if (!url || !selectedKey) {
    return {
      mode: 'invalid',
      message: 'La aplicación no pudo iniciar porque su configuración está incompleta.',
    };
  }

  return {
    mode: 'supabase',
    url,
    publishableKey: selectedKey,
    keySource: publishableKey ? 'publishable' : 'legacy-anon',
  };
}

export const supabaseConfiguration = resolveSupabaseConfiguration({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
