import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

export type SessionUser = {
  id: string
  email: string
  name: string
  initials: string
  /** Placeholder until roles live in the domain database. */
  role: string
  avatarUrl: string | null
}

function toSessionUser(user: User): SessionUser {
  const metadata = user.user_metadata ?? {}
  const rawName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "Kullanıcı"

  const initials = rawName
    .split(/\s+/)
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return {
    id: user.id,
    email: user.email ?? "",
    name: rawName,
    initials: initials || "SF",
    role: typeof metadata.role === "string" ? metadata.role : "Sponsorluk Ekibi",
    avatarUrl:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
  }
}

/**
 * Reads the authenticated user for the current request. Memoized per render
 * pass so multiple callers (layout, header, page) share one Supabase call.
 * Returns `null` when there is no valid session.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ? toSessionUser(user) : null
})

/**
 * Same as `getUser` but redirects unauthenticated requests to `/login`. Use in
 * every protected Server Component / layout so the check lives next to the data.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getUser()
  if (!user) redirect("/login")
  return user
})
