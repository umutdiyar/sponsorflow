import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/env"

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * `cookies()` is request-scoped in the App Router, so this must be created per
 * request. Writing cookies from a Server Component render is not allowed by
 * Next.js; the `setAll` try/catch swallows that case, and session refresh is
 * handled in `proxy.ts` instead.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabaseConfig()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component — safe to ignore, `proxy.ts` refreshes.
        }
      },
    },
  })
}
