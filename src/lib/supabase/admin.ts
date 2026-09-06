import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabaseConfig, getSupabaseSecretKey } from "@/lib/env"

/**
 * Privileged Supabase client backed by the **secret (service_role) key**.
 *
 * - `server-only`: this module must never end up in the browser bundle.
 * - It is a plain `@supabase/supabase-js` client with no session persistence —
 *   completely separate from the cookie-based auth client in `server.ts` /
 *   `client.ts`. It is used only for Auth Admin operations (inviting users).
 * - Do NOT use it for reading the current request's user or session.
 */
let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!cached) {
    const { url } = getSupabaseConfig()
    cached = createClient(url, getSupabaseSecretKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    })
  }
  return cached
}
