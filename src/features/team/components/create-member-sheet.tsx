"use client"

import { useState, useTransition } from "react"
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ORGANIZATION_ROLE_LABELS,
  type AssignableRole,
} from "@/lib/auth/permissions"
import { createMember } from "@/features/team/actions"
import { createMemberSchema, TEMP_PASSWORD_MIN } from "@/features/team/schema"

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

/** Client-only. Never sent to a log; only rendered once for the admin to copy. */
function generatePassword(length = 14): string {
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const digits = "23456789"
  const symbols = "!@#$%*?-_"
  const all = lower + upper + digits + symbols
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  const pick = (set: string, n: number) => set[n % set.length]
  const out = [
    pick(lower, bytes[0]),
    pick(upper, bytes[1]),
    pick(digits, bytes[2]),
    pick(symbols, bytes[3]),
  ]
  for (let i = 4; i < length; i++) out.push(pick(all, bytes[i]))
  // Fisher–Yates with fresh randomness so the guaranteed chars aren't positional.
  const shuffle = new Uint32Array(out.length)
  crypto.getRandomValues(shuffle)
  for (let i = out.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join("")
}

export type CreatedCredentials = { email: string; password: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: AssignableRole[]
  onCreated: (creds: CreatedCredentials) => void
}

export function CreateMemberSheet({
  open,
  onOpenChange,
  roles,
  onCreated,
}: Props) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AssignableRole>(
    roles.includes("MEMBER") ? "MEMBER" : (roles[0] ?? "VIEWER")
  )
  const [password, setPassword] = useState("")
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFullName("")
      setEmail("")
      setRole(roles.includes("MEMBER") ? "MEMBER" : (roles[0] ?? "VIEWER"))
      setPassword(generatePassword())
      setReveal(false)
      setError(null)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = createMemberSchema.safeParse({
      fullName,
      email,
      role,
      password,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Form geçersiz.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createMember({ fullName, email, role, password })
      if (result.ok) {
        onOpenChange(false)
        onCreated({ email: result.member.email, password })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Ekip üyesi ekle</SheetTitle>
          <SheetDescription>
            Hesap hemen oluşturulur. Üye, verdiğin e-posta ve geçici şifre ile
            giriş ekranından girer.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Ad Soyad<span className="text-destructive"> *</span>
              </span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Yağmur Demir"
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                E-posta<span className="text-destructive"> *</span>
              </span>
              <Input
                type="email"
                inputMode="email"
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
                onChange={(e) => setRole(e.target.value as AssignableRole)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ORGANIZATION_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Geçici Şifre<span className="text-destructive"> *</span>
              </span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={reveal ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9 font-mono"
                    autoComplete="off"
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Güçlü şifre oluştur"
                  onClick={() => {
                    setPassword(generatePassword())
                    setReveal(true)
                  }}
                >
                  <RefreshCwIcon />
                </Button>
              </div>
              <span className="text-muted-foreground text-xs">
                En az {TEMP_PASSWORD_MIN} karakter. Üye ilk girişten sonra
                Ayarlar’dan değiştirebilir.
              </span>
            </div>

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
                  Oluşturuluyor…
                </>
              ) : (
                "Hesap Oluştur"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/**
 * One-time credentials view. The password lives only in this component's props
 * for the current session — closing it discards it for good.
 */
export function CredentialsDialog({
  creds,
  title = "Ekip üyesi oluşturuldu.",
  onClose,
}: {
  creds: CreatedCredentials | null
  title?: string
  onClose: () => void
}) {
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState<"email" | "password" | null>(null)

  const [prevKey, setPrevKey] = useState(creds?.password ?? null)
  if ((creds?.password ?? null) !== prevKey) {
    setPrevKey(creds?.password ?? null)
    setReveal(false)
    setCopied(null)
  }

  async function copy(what: "email" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error("Kopyalanamadı.")
    }
  }

  return (
    <Dialog
      open={creds !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Bu bilgileri ekip üyesiyle güvenli bir kanaldan paylaş. Şifre bu
            pencere kapandıktan sonra tekrar gösterilemez.
          </DialogDescription>
        </DialogHeader>

        {creds ? (
          <div className="flex flex-col gap-3">
            <Field label="E-posta">
              <code className="flex-1 truncate text-sm">{creds.email}</code>
              <IconBtn
                label="E-postayı kopyala"
                done={copied === "email"}
                onClick={() => copy("email", creds.email)}
              />
            </Field>
            <Field label="Geçici Şifre">
              <code className="flex-1 truncate font-mono text-sm">
                {reveal ? creds.password : "•".repeat(creds.password.length)}
              </code>
              <IconBtn
                label={reveal ? "Şifreyi gizle" : "Şifreyi göster"}
                icon={
                  reveal ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )
                }
                onClick={() => setReveal((v) => !v)}
              />
              <IconBtn
                label="Şifreyi kopyala"
                done={copied === "password"}
                onClick={() => copy("password", creds.password)}
              />
            </Field>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="border-border bg-muted/40 flex items-center gap-1.5 rounded-lg border px-2.5 py-2">
        {children}
      </div>
    </div>
  )
}

function IconBtn({
  label,
  icon,
  done,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  done?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground hover:bg-background shrink-0 rounded p-1"
    >
      {done ? (
        <CheckIcon className="size-4 text-success" />
      ) : (
        (icon ?? <CopyIcon className="size-4" />)
      )}
    </button>
  )
}
