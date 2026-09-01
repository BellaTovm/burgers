import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to the project environment.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new SupabaseConfigurationError();
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}