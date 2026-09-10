"use client"

import { useState, useTransition } from "react"
import {
  BuildingIcon,
  CalendarClockIcon,
  ClockAlertIcon,
  KeyRoundIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  UserMinusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ORGANIZATION_ROLE_LABELS,
  grantableRoles,
  type AssignableRole,
} from "@/lib/auth/permissions"
import type { OrganizationRole } from "@/generated/prisma/enums"
import { removeMember, resetMemberPassword, updateMemberRole } from "@/features/team/actions"
import {
  CreateMemberSheet,
  CredentialsDialog,
  type CreatedCredentials,
} from "@/features/team/components/create-member-sheet"
import { resetMemberPasswordSchema, TEMP_PASSWORD_MIN } from "@/features/team/schema"
import type { TeamMemberRow } from "@/features/team/queries"

type Props = {
  members: TeamMemberRow[]
  actorRole: OrganizationRole
  can: {
    create: boolean
    changeRole: boolean
    remove: boolean
    resetPassword: boolean
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function makePassword(length = 14): string {
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const digits = "23456789"
  const symbols = "!@#$%*?-_"
  const all = lower + upper + digits + symbols
  const b = new Uint32Array(length)
  crypto.getRandomValues(b)
  const p = (s: string, n: number) => s[n % s.length]
  const out = [p(lower, b[0]), p(upper, b[1]), p(digits, b[2]), p(symbols, b[3])]
  for (let i = 4; i < length; i++) out.push(p(all, b[i]))
  const sh = new Uint32Array(out.length)
  crypto.getRandomValues(sh)
  for (let i = out.length - 1; i > 0; i--) {
    const j = sh[i] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join("")
}

export function TeamView({ members, actorRole, can }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null)
  const [resetTarget, setResetTarget] = useState<TeamMemberRow | null>(null)
  const [creds, setCreds] = useState<CreatedCredentials | null>(null)
  const [credsTitle, setCredsTitle] = useState("Ekip üyesi oluşturuldu.")
  const grantable = grantableRoles(actorRole)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold">
          Aktif Üyeler{" "}
          <span className="text-muted-foreground font-normal">
            ({members.length})
          </span>
        </h2>
        {can.create ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Ekip Üyesi Ekle
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-160 border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-3 py-2 font-medium">Üye</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 text-right font-medium">Firmalar</th>
              <th className="px-3 py-2 text-right font-medium">Takip</th>
              <th className="px-3 py-2 text-right font-medium">Planlanan İş</th>
              <th className="w-8 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {members.map((m) => (
              <MemberRow
                key={m.membershipId}
                member={m}
                grantable={grantable}
                can={can}
                onRemove={() => setRemoveTarget(m)}
                onReset={() => setResetTarget(m)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <CreateMemberSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={grantable}
        onCreated={(c) => {
          setCredsTitle("Ekip üyesi oluşturuldu.")
          setCreds(c)
        }}
      />
      <CredentialsDialog
        creds={creds}
        title={credsTitle}
        onClose={() => setCreds(null)}
      />
      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(o) => {
          if (!o) setResetTarget(null)
        }}
        onReset={(c) => {
          setResetTarget(null)
          setCredsTitle("Geçici şifre sıfırlandı.")
          setCreds(c)
        }}
      />
      <RemoveMemberDialog
        target={removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null)
        }}
      />
    </div>
  )
}

function MemberRow({
  member: m,
  grantable,
  can,
  onRemove,
  onReset,
}: {
  member: TeamMemberRow
  grantable: AssignableRole[]
  can: Props["can"]
  onRemove: () => void
  onReset: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const manageable =
    m.role !== "OWNER" &&
    !m.isCurrentUser &&
    (grantable as OrganizationRole[]).includes(m.role)
  const showRoleMenu = can.changeRole && manageable
  const showRemove = can.remove && manageable
  const showReset = can.resetPassword && manageable
  const hasMenu = showRoleMenu || showRemove || showReset

  function changeRole(role: AssignableRole) {
    if (role === m.role) return
    startTransition(async () => {
      const result = await updateMemberRole(m.membershipId, { role })
      if (result.ok) toast.success("Rol güncellendi.")
      else toast.error(result.error)
    })
  }

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(m.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1.5 font-medium">
              {m.name}
              {m.isCurrentUser ? (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[0.625rem]">
                  Sen
                </span>
              ) : null}
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {m.email}
            </span>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="bg-brand-muted text-brand-foreground rounded-full px-2 py-0.5 text-xs font-medium">
          {m.roleLabel}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span className="inline-flex items-center gap-1">
          <BuildingIcon className="text-muted-foreground size-3.5" />
          {m.stats.companies}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        <span
          className={cn(
            "inline-flex items-center gap-1",
            m.stats.followUps > 0 && "text-destructive font-medium"
          )}
        >
          <ClockAlertIcon className="size-3.5" />
          {m.stats.followUps}
        </span>
      </td>
      <td className="text-muted-foreground px-3 py-2.5 text-right tabular-nums">
        <span className="inline-flex items-center gap-1">
          <CalendarClockIcon className="size-3.5" />
          {m.stats.plannedTasks}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Üye işlemleri"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <MoreHorizontalIcon />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showRoleMenu ? (
                <>
                  <DropdownMenuLabel>Rolü değiştir</DropdownMenuLabel>
                  {grantable.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      onSelect={() => changeRole(r)}
                      className={cn(r === m.role && "font-medium")}
                    >
                      {ORGANIZATION_ROLE_LABELS[r]}
                      {r === m.role ? " ·" : ""}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
              {showRoleMenu && (showReset || showRemove) ? (
                <DropdownMenuSeparator />
              ) : null}
              {showReset ? (
                <DropdownMenuItem onSelect={onReset}>
                  <KeyRoundIcon />
                  Geçici Şifre Sıfırla
                </DropdownMenuItem>
              ) : null}
              {showRemove ? (
                <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                  <UserMinusIcon />
                  Üyeliği Kaldır
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </td>
    </tr>
  )
}

function ResetPasswordDialog({
  target,
  onOpenChange,
  onReset,
}: {
  target: TeamMemberRow | null
  onOpenChange: (open: boolean) => void
  onReset: (creds: CreatedCredentials) => void
}) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [prevId, setPrevId] = useState(target?.membershipId ?? null)
  if ((target?.membershipId ?? null) !== prevId) {
    setPrevId(target?.membershipId ?? null)
    setPassword(target ? makePassword() : "")
    setError(null)
  }

  function onConfirm() {
    if (!target) return
    const parsed = resetMemberPasswordSchema.safeParse({ password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Şifre geçersiz.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await resetMemberPassword(target.membershipId, {
        password,
      })
      if (result.ok) {
        onReset({ email: target.email, password })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Geçici şifre sıfırla</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{target?.name}</span> için yeni bir
            geçici şifre belirlenir. Şifre yalnızca bir kez gösterilir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-mono"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Yeni şifre oluştur"
            onClick={() => setPassword(makePassword())}
          >
            <RefreshCwIcon />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          En az {TEMP_PASSWORD_MIN} karakter.
        </p>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Şifreyi Sıfırla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveMemberDialog({
  target,
  onOpenChange,
}: {
  target: TeamMemberRow | null
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function onConfirm() {
    if (!target) return
    startTransition(async () => {
      const result = await removeMember(target.membershipId)
      if (result.ok) {
        toast.success("Üyelik kaldırıldı.")
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Üyeliği kaldır</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{target?.name}</span> ekipten
            çıkarılacak ve panele erişimi kalkacak. Sahibi olduğu firmalar
            sahipsiz kalır; açık süreç ve görevleri sana devredilir. Geçmiş
            kayıtları korunur.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Üyeliği Kaldır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
