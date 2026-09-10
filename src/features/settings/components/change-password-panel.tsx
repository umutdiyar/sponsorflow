"use client"

import { useState, useTransition } from "react"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { changeOwnPassword } from "@/features/settings/actions"
import { changePasswordSchema, PASSWORD_MIN } from "@/features/settings/schema"

export function ChangePasswordPanel() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = changePasswordSchema.safeParse({ password, confirm })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await changeOwnPassword({ password, confirm })
      if (result.ok) {
        toast.success("Şifren güncellendi.")
        setPassword("")
        setConfirm("")
        setReveal(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Panel>
      <PanelHeader
        title="Şifre Değiştir"
        description="İlk girişten sonra geçici şifreni burada değiştir."
      />
      <PanelContent>
        <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Yeni Şifre</span>
            <div className="relative">
              <Input
                type={reveal ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Şifreyi gizle" : "Şifreyi göster"}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                {reveal ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
              </button>
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Yeni Şifre (Tekrar)</span>
            <Input
              type={reveal ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          <span className="text-muted-foreground text-xs">
            En az {PASSWORD_MIN} karakter.
          </span>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Şifreyi Güncelle
            </Button>
          </div>
        </form>
      </PanelContent>
    </Panel>
  )
}
