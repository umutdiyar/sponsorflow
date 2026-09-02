import type { Metadata } from "next"
import { TargetIcon, CheckSquareIcon } from "lucide-react"

import { requireMembership } from "@/lib/auth/membership"
import { PageHeader } from "@/components/common/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/format"
import { getTeamMembers } from "@/features/team/queries"

export const metadata: Metadata = { title: "Ekip" }

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export default async function TeamPage() {
  const membership = await requireMembership()
  const members = await getTeamMembers(
    membership.organizationId,
    membership.membershipId
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ekip"
        description="Sponsorluk ekibindeki üyeler, rolleri ve katılım tarihleri."
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {members.map((m) => (
          <li
            key={m.membershipId}
            className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 text-sm ring-1"
          >
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
            </div>

            <div className="flex items-center justify-between">
              <span className="bg-brand-muted text-brand-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                {m.roleLabel}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDate(m.joinedAt)} tarihinde katıldı
              </span>
            </div>

            <div className="text-muted-foreground flex gap-4 border-t pt-2 text-xs">
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
        ))}
      </ul>

      <p className="text-muted-foreground text-xs">
        Üye daveti ve rol yönetimi sonraki sürümde eklenecek.
      </p>
    </div>
  )
}
