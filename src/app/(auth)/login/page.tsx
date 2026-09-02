import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getUser } from "@/lib/auth/dal"
import { LoginForm } from "@/features/auth/components/login-form"

export const metadata: Metadata = {
  title: "Giriş Yap",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getUser()
  if (user) redirect("/dashboard")

  const { next } = await searchParams
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          SponsorFlow&apos;a giriş yap
        </h1>
        <p className="text-muted-foreground text-sm">
          Sponsorluk süreçlerinizi tek noktadan yönetin.
        </p>
      </div>

      <LoginForm next={safeNext} />

      <p className="text-muted-foreground text-xs leading-relaxed">
        Hesabın yok mu? Üyeler organizasyon yöneticisi tarafından davet edilir.
        Erişim için ekip liderinle iletişime geç.
      </p>
    </div>
  )
}
