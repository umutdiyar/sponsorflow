"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ORGANIZATION_ROLE_LABELS,
  type AssignableRole,
} from "@/lib/auth/permissions"
import { inviteMember } from "@/features/team/actions"
import { inviteMemberSchema } from "@/features/team/schema"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Roles the current user is allowed to grant. */
  roles: AssignableRole[]
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

export function InviteMemberSheet({ open, onOpenChange, roles }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AssignableRole>(
    roles.includes("MEMBER") ? "MEMBER" : (roles[0] ?? "VIEWER")
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFullName("")
      setEmail("")
      setRole(roles.includes("MEMBER") ? "MEMBER" : (roles[0] ?? "VIEWER"))
      setError(null)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = inviteMemberSchema.safeParse({ fullName, email, role })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.")
      return
    }
    setError(null)
    startTransition(async () => {
      const trimmedEmail = email.trim()
      const result = await inviteMember({ fullName, email, role })
      if (result.ok) {
        toast.success(
          result.emailDelivered
            ? `${trimmedEmail} adresine davet gönderildi.`
            : (result.message ??
                "Davet kaydedildi ancak e-posta gönderilemedi.")
        )
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Üye davet et</SheetTitle>
          <SheetDescription>
            Davet edilen kişi e-posta ile bir bağlantı alır, şifresini belirler
            ve ekibe katılır.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Ad Soyad</span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Yağmur Demir"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                E-posta<span className="text-destructive"> *</span>
              </span>
              <Input
                type="email"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ad.soyad@ornek.com"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Rol<span className="text-destructive"> *</span>
              </span>
              <select
                className={selectClass}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as AssignableRole)
                }
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ORGANIZATION_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <SheetClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Vazgeç
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Gönderiliyor…
                </>
              ) : (
                "Davet Gönder"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
