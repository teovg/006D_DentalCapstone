import { describe, expect, it } from 'vitest';
import { expoArguments, localDemoEnvironment } from './options.mjs';

describe('arranque explícito de demo Android', () => {
  it('excluye configuración remota sin cambiar el entorno original', () => {
    const source = { EXPO_PUBLIC_SUPABASE_URL: 'https://example.test', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'legacy-test', EXPO_PUBLIC_UI_REVIEW: '1', JAVA_HOME: 'java-test' };
    expect(localDemoEnvironment(source)).toEqual({ EXPO_NO_DOTENV: '1', EXPO_NO_TELEMETRY: '1', JAVA_HOME: 'java-test' });
    expect(source.EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.test');
  });

  it('evita opciones de Expo incompatibles al compilar sin servidor', () => {
    expect(expoArguments(['--no-bundler', '--device', 'DentalTrack_API35'])).toEqual(['run:android', '--no-bundler', '--device', 'DentalTrack_API35']);
    expect(expoArguments([])).toEqual(['run:android', '--port', '8081']);
    expect(expoArguments(['--serve', '--clear'])).toEqual(['start', '--dev-client', '--localhost', '--port', '8081', '--max-workers', '1', '--clear']);
  });
});
