import { supabaseConfiguration } from '../../config/supabaseConfig';
import { LocalDentalRepository } from '../../infra/local/LocalDentalRepository';
import { createDentalTrackSupabaseClient } from '../../infra/supabase/client';
import { SupabaseDentalRepository } from '../../infra/supabase/SupabaseDentalRepository';

export const supabaseClient =
  supabaseConfiguration.mode === 'supabase'
    ? createDentalTrackSupabaseClient(
        supabaseConfiguration.url,
        supabaseConfiguration.publishableKey,
      )
    : null;

export const dentalRepository =
  supabaseConfiguration.mode === 'supabase' && supabaseClient
    ? new SupabaseDentalRepository(supabaseClient)
    : supabaseConfiguration.mode === 'local-demo'
      ? new LocalDentalRepository(globalThis.localStorage)
      : null;

export function clearDentalRepositorySession(): void {
  if (dentalRepository instanceof SupabaseDentalRepository) {
    dentalRepository.clearPatientCache();
  }
}
