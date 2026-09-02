/**
 * "Beni hatırla" (remember me) support for Supabase SSR cookies.
 *
 * Supabase SSR always writes its auth cookies with a fixed 400-day `maxAge`
 * (see `@supabase/ssr` `applyServerStorage`), so there is no first-class toggle.
 * We post-process the cookie options *in our own `setAll` boundary* (the one
 * place we fully control): when remember-me is off, we strip `maxAge`/`expires`
 * from the `sb-*` auth cookies so they become session cookies that the browser
 * drops on close. Tokens and the refresh flow are untouched — only persistence
 * changes. Logout still clears everything.
 *
 * Caveat: browsers with "continue where you left off" / session restore keep
 * session cookies across restarts; that is browser behaviour, not a bug here.
 */

export const REMEMBER_COOKIE = "sf-remember"

/** 400 days, matching Supabase's own default. */
export const REMEMBER_MAX_AGE = 400 * 24 * 60 * 60

type CookieToSet = {
  name: string
  value: string
  options?: { maxAge?: number; expires?: Date | number; [key: string]: unknown }
}

/** Remember-me is the default; only an explicit "0" opts out. */
export function parseRemember(value: string | undefined): boolean {
  return value !== "0"
}

function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-")
}

/**
 * Rewrites the cookie list Supabase asked us to set. When `remember` is false,
 * auth cookies are downgraded to session cookies.
 */
export function applyPersistence<T extends CookieToSet>(
  cookiesToSet: readonly T[],
  remember: boolean
): T[] {
  if (remember) return [...cookiesToSet]

  return cookiesToSet.map((cookie) => {
    if (!isSupabaseAuthCookie(cookie.name)) return cookie
    const options = { ...(cookie.options ?? {}) }
    delete options.maxAge
    delete options.expires
    return { ...cookie, options }
  })
}
