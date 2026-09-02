import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import { getSupabaseConfig } from "@/lib/env"

/** Route prefixes that never require authentication. */
const PUBLIC_ROUTES = ["/login", "/forgot-password", "/auth"]

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Refreshes the Supabase session cookies on every matched request and performs
 * an optimistic auth redirect. This only reads the session from cookies — no
 * database work — as recommended for proxy/middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { url, publishableKey } = getSupabaseConfig()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
