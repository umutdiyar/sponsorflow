"use client"

import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/env"

/**
 * Supabase client for use in Client Components. Safe for the browser bundle:
 * it only ever touches the public URL + publishable key.
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseConfig()
  return createBrowserClient(url, publishableKey)
}
