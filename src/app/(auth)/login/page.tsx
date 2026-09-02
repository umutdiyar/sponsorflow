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
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Tekrar hoş geldin
        </h1>
        <p className="text-muted-foreground text-sm">
          Hesabına giriş yaparak devam et.
        </p>
      </div>

      <LoginForm next={safeNext} />

      <p className="text-muted-foreground text-xs leading-relaxed">
        Bu panel yalnızca yetkilendirilmiş ekip üyeleri içindir.
      </p>
    </div>
  )
}
