import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | null = null;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to the project environment.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

function credentials(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError();
  }

  return { url, anonKey };
}

/**
 * Shared client for public, unauthenticated reads (menu categories and
 * products, which have `using (true)` policies).
 *
 * It carries no session, so `auth.uid()` is NULL for every query made through
 * it. Never use it to read user-scoped tables: RLS policies keyed on
 * `auth.uid()` match nothing and PostgREST returns zero rows with no error,
 * which reads as "not found" rather than "forbidden".
 */
export function getSupabaseClient(): SupabaseClient {
  if (anonClient) return anonClient;

  const { url, anonKey } = credentials();

  anonClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return anonClient;
}

/**
 * Client that acts as the signed-in user. Forwarding the access token to
 * PostgREST makes the request run as `authenticated` with `auth.uid()` set,
 * so the existing RLS policies (`profiles.auth.uid() = id`, and the
 * role-aware `orders` policy) apply as written.
 *
 * Deliberately not cached — each token is a different identity.
 */
export function getUserScopedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = credentials();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/** Base URL and anon key, for the few calls made against GoTrue directly. */
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return credentials();
}
