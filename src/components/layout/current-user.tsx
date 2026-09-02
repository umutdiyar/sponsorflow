"use client"

import { createContext, useContext } from "react"

import type { SessionUser } from "@/lib/auth/dal"

const CurrentUserContext = createContext<SessionUser | null>(null)

export function CurrentUserProvider({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  )
}

/**
 * The authenticated user, already validated by `requireUser()` in the dashboard
 * layout and passed down. Lets nested pages show account details without a
 * second `getUser()` round-trip.
 */
export function useCurrentUser(): SessionUser {
  const user = useContext(CurrentUserContext)
  if (!user) {
    throw new Error("useCurrentUser must be used within <CurrentUserProvider>")
  }
  return user
}
