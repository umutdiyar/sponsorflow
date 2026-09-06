"use client"

import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { signOut } from "@/features/auth/actions"

/**
 * App-wide error boundary. Catches errors thrown anywhere below the root
 * layout — including the dashboard shell layout — so a single component crash
 * degrades to a recoverable screen instead of Next's bare 500 page.
 * Route-level errors are still handled first by nearer boundaries
 * (e.g. `(dashboard)/error.tsx`).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [signingOut, startSignOut] = useTransition()

  useEffect(() => {
    console.error(error)
  }, [error])

  // A ForbiddenError from the shell layout means the signed-in user has no
  // active membership (not invited, or access removed). Retrying just re-throws,
  // so the only useful action is to sign out.
  const isForbidden = error.name === "ForbiddenError"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          {isForbidden ? "Bu panele erişimin yok" : "Bir şeyler ters gitti"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isForbidden
            ? error.message ||
              "Bir yönetici seni davet ettikten sonra tekrar giriş yapabilirsin."
            : "Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da sayfayı yenileyebilirsin."}
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="bg-muted text-muted-foreground mt-2 max-h-48 overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {isForbidden ? (
          <Button
            onClick={() => startSignOut(() => signOut())}
            disabled={signingOut}
          >
            Çıkış Yap
          </Button>
        ) : (
          <>
            <Button onClick={reset}>Tekrar dene</Button>
            <Button
              variant="outline"
              onClick={() => {
                router.push("/dashboard")
                router.refresh()
              }}
            >
              Genel Bakış&apos;a dön
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
