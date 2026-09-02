import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/env"
import {
  applyPersistence,
  parseRemember,
  REMEMBER_COOKIE,
} from "@/lib/auth/persistence"

/** Route prefixes that never require authentication. */
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth"]

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isPrefetch(request: NextRequest) {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-purpose") === "prefetch" ||
    request.headers.get("x-middleware-prefetch") === "1"
  )
}

/**
 * Runs before every matched request. Two jobs:
 *
 *  1. Keep the Supabase auth cookies fresh (`getSession()` refreshes them only
 *     when the access token is at/near expiry — otherwise it's a local cookie
 *     read with no network call).
 *  2. Optimistic auth redirect for `/login` <-> `/dashboard`.
 *
 * This is an *optimistic* check by design (Next.js auth guidance): it trusts the
 * cookie without a server round-trip on the hot path. The authoritative check is
 * `requireUser()` in `(dashboard)/layout.tsx`, which calls `getUser()` (verified
 * against Supabase) on every protected render.
 *
 * Prefetch requests never commit a navigation, so they skip all of this — the
 * real navigation that follows re-runs the proxy.
 */
export async function updateSession(request: NextRequest) {
  if (isPrefetch(request)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const remember = parseRemember(request.cookies.get(REMEMBER_COOKIE)?.value)
  const { url, publishableKey } = getSupabaseConfig()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        const toSet = applyPersistence(cookiesToSet, remember)
        for (const { name, value } of toSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const isAuthed = Boolean(session?.user)

  const { pathname } = request.nextUrl

  if (!isAuthed && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthed && (pathname === "/login" || pathname === "/")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
