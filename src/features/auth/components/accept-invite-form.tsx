"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircleIcon, Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type Props = {
  email: string
  organizationName: string
  roleLabel: string
}

export function AcceptInviteForm({ email, organizationName, roleLabel }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.")
      return
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.")
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(
          "Şifre kaydedilemedi. Bağlantının süresi dolmuş olabilir; yeni bir davet iste."
        )
        return
      }
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="bg-muted/50 text-muted-foreground rounded-lg border px-3 py-2.5 text-sm">
        <span className="text-foreground font-medium">{organizationName}</span>{" "}
        ekibine <span className="text-foreground font-medium">{roleLabel}</span>{" "}
        olarak katılıyorsun.
        <br />
        {email}
      </div>

      {error ? (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Şifre belirle</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          className="h-10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Şifreyi tekrarla</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="h-10"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="mt-1 h-10 w-full"
      >
        {isPending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Kaydediliyor…
          </>
        ) : (
          "Şifreyi kaydet ve devam et"
        )}
      </Button>
    </form>
  )
}
