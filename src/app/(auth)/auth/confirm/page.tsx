"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

/**
 * Landing point for Supabase email links (recovery / magic-link, should SMTP be
 * enabled later). The link lands here with the session either in the URL hash
 * (`#access_token=…`, implicit flow) or as a `?code=` (PKCE). We establish the
 * cookie session, then hand off to the dashboard — membership provisioning runs
 * there. Day-to-day team accounts are created directly and never touch this
 * route.
 */
export default function AuthConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function run() {
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : null
      const url = new URL(window.location.href)

      try {
        if (hash?.get("access_token") && hash.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          })
          if (error) throw error
        } else if (url.searchParams.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            url.searchParams.get("code")!
          )
          if (error) throw error
        } else {
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            setError(
              "Bu bağlantı geçersiz ya da süresi dolmuş. Yöneticinden yeni bir davet iste."
            )
            return
          }
        }

        // Clean the tokens out of the address bar, then continue.
        window.history.replaceState(null, "", "/auth/confirm")
        router.replace("/dashboard")
      } catch {
        setError(
          "Oturum doğrulanamadı. Bağlantının süresi dolmuş olabilir; yeni bir davet iste."
        )
      }
    }

    void run()
  }, [router])

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      {error ? (
        <>
          <p className="text-sm">{error}</p>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            Girişe dön
          </Link>
        </>
      ) : (
        <>
          <Loader2Icon className="text-muted-foreground size-5 animate-spin" />
          <p className="text-muted-foreground text-sm">Bağlantı doğrulanıyor…</p>
        </>
      )}
    </div>
  )
}
