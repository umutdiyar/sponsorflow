import type { Metadata } from "next"

import { requireMembership } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { getTeamPageData } from "@/features/team/queries"
import { TeamView } from "@/features/team/components/team-view"

export const metadata: Metadata = { title: "Ekip" }

export default async function TeamPage() {
  const membership = await requireMembership()
  const { members, invitations } = await getTeamPageData(
    membership.organizationId,
    membership.membershipId
  )

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ekip"
        description="Ekip üyelerini davet et, rollerini yönet ve bekleyen davetleri takip et."
      />

      <TeamView
        members={members}
        invitations={invitations}
        actorRole={membership.role}
        can={{
          invite: hasPermission(membership.role, "invitation:create"),
          revoke: hasPermission(membership.role, "invitation:revoke"),
          changeRole: hasPermission(membership.role, "member:update"),
          remove: hasPermission(membership.role, "member:remove"),
        }}
      />
    </div>
  )
}
