"use client"

import { useState, useTransition } from "react"
import {
  BuildingIcon,
  CheckSquareIcon,
  Loader2Icon,
  MailIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TargetIcon,
  UserMinusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { EmptyState } from "@/components/common/empty-state"
import { formatDate, formatRelativeDay } from "@/lib/format"
import {
  ORGANIZATION_ROLE_LABELS,
  grantableRoles,
  type AssignableRole,
} from "@/lib/auth/permissions"
import type { OrganizationRole } from "@/generated/prisma/enums"
import {
  removeMember,
  resendInvitation,
  revokeInvitation,
  updateMemberRole,
} from "@/features/team/actions"
import { InviteMemberSheet } from "@/features/team/components/invite-member-sheet"
import type {
  PendingInvitationRow,
  TeamMemberRow,
} from "@/features/team/queries"

type Props = {
  members: TeamMemberRow[]
  invitations: PendingInvitationRow[]
  actorRole: OrganizationRole
  can: {
    invite: boolean
    revoke: boolean
    changeRole: boolean
    remove: boolean
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function TeamView({ members, invitations, actorRole, can }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null)
  const grantable = grantableRoles(actorRole)

  return (
    <div className="flex flex-col gap-8">
      {/* Active members */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold">
            Aktif Üyeler{" "}
            <span className="text-muted-foreground font-normal">
              ({members.length})
            </span>
          </h2>
          {can.invite ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon />
              Üye Davet Et
            </Button>
          ) : null}
        </div>

        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {members.map((m) => (
            <MemberCard
              key={m.membershipId}
              member={m}
              grantable={grantable}
              can={can}
              onRemove={() => setRemoveTarget(m)}
            />
          ))}
        </ul>
      </section>

      {/* Pending invitations */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-sm font-semibold">
          Bekleyen Davetler{" "}
          <span className="text-muted-foreground font-normal">
            ({invitations.length})
          </span>
        </h2>

        {invitations.length === 0 ? (
          <EmptyState
            icon={MailIcon}
            title="Bekleyen davet yok."
            description="Yeni bir ekip üyesi eklemek için “Üye Davet Et” butonunu kullan."
          />
        ) : (
          <ul className="divide-border overflow-hidden rounded-xl border">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} can={can} />
            ))}
          </ul>
        )}
      </section>

      <InviteMemberSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={grantable}
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

function MemberCard({
  member: m,
  grantable,
  can,
  onRemove,
}: {
  member: TeamMemberRow
  grantable: AssignableRole[]
  can: Props["can"]
  onRemove: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const manageable =
    m.role !== "OWNER" &&
    !m.isCurrentUser &&
    (grantable as OrganizationRole[]).includes(m.role)
  const showRoleMenu = can.changeRole && manageable
  const showRemove = can.remove && manageable

  function changeRole(role: AssignableRole) {
    if (role === m.role) return
    startTransition(async () => {
      const result = await updateMemberRole(m.membershipId, { role })
      if (result.ok) toast.success("Rol güncellendi.")
      else toast.error(result.error)
    })
  }

  return (
    <li className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 text-sm ring-1">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback>{initials(m.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
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

        {showRoleMenu || showRemove ? (
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
            <DropdownMenuContent align="end" className="w-48">
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
              {showRoleMenu && showRemove ? <DropdownMenuSeparator /> : null}
              {showRemove ? (
                <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                  <UserMinusIcon />
                  Üyeliği Kaldır
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span className="bg-brand-muted text-brand-foreground rounded-full px-2 py-0.5 text-xs font-medium">
          {m.roleLabel}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatDate(m.joinedAt)} tarihinde katıldı
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <BuildingIcon className="size-3.5" />
          {m.stats.openCompanies} firma
        </span>
        <span className="inline-flex items-center gap-1">
          <TargetIcon className="size-3.5" />
          {m.stats.openOpportunities} açık fırsat
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckSquareIcon className="size-3.5" />
          {m.stats.openTasks} açık görev
        </span>
      </div>
    </li>
  )
}

function InvitationRow({
  invitation: inv,
  can,
}: {
  invitation: PendingInvitationRow
  can: Props["can"]
}) {
  const [isPending, startTransition] = useTransition()

  function onResend() {
    startTransition(async () => {
      const result = await resendInvitation(inv.id)
      if (result.ok) {
        toast.success(
          result.emailDelivered
            ? "Davet yeniden gönderildi."
            : (result.message ?? "Davet güncellendi.")
        )
      } else {
        toast.error(result.error)
      }
    })
  }

  function onRevoke() {
    startTransition(async () => {
      const result = await revokeInvitation(inv.id)
      if (result.ok) toast.success("Davet iptal edildi.")
      else toast.error(result.error)
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm not-last:border-b">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {inv.fullName?.trim() || inv.email}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {inv.email} · {inv.invitedByName} davet etti ·{" "}
          {inv.expiresAt
            ? `son ${formatRelativeDay(inv.expiresAt)}`
            : formatDate(inv.createdAt)}
        </span>
      </div>
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
        {inv.roleLabel}
      </span>
      {can.invite || can.revoke ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Davet işlemleri"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <MoreHorizontalIcon />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {can.invite ? (
              <DropdownMenuItem onSelect={onResend}>
                <MailIcon />
                Daveti Yeniden Gönder
              </DropdownMenuItem>
            ) : null}
            {can.revoke ? (
              <DropdownMenuItem variant="destructive" onSelect={onRevoke}>
                Daveti İptal Et
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
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
            sahipsiz kalır; açık fırsat ve görevleri sana devredilir. Geçmiş
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
