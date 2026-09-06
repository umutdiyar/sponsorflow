import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { PageHeader } from "@/components/common/page-header"
import { listCompanyOptions, listMembers } from "@/lib/org/reference"
import { getActivitiesFeed } from "@/features/activities/queries"
import { ActivitiesFeed } from "@/features/activities/components/activities-feed"

export const metadata: Metadata = { title: "Aktiviteler" }

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    channel?: string
    kind?: string
    direction?: string
    member?: string
    company?: string
    from?: string
    to?: string
  }>
}) {
  const membership = await requirePermission("activity:read")
  const sp = await searchParams

  const [feed, members, companies] = await Promise.all([
    getActivitiesFeed({
      organizationId: membership.organizationId,
      channel: sp.channel,
      kind: sp.kind,
      direction: sp.direction,
      memberId: sp.member,
      companyId: sp.company,
      from: sp.from,
      to: sp.to,
    }),
    listMembers(membership.organizationId),
    listCompanyOptions(membership.organizationId),
  ])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Aktiviteler"
        description="Tüm firmalardaki iletişim ve not kayıtlarının ortak akışı."
      />

      <ActivitiesFeed
        initialItems={feed.items}
        initialCursor={feed.nextCursor}
        filters={{
          channel: sp.channel ?? "",
          kind: sp.kind ?? "",
          direction: sp.direction ?? "",
          member: sp.member ?? "",
          company: sp.company ?? "",
          from: sp.from ?? "",
          to: sp.to ?? "",
        }}
        members={members}
        companies={companies}
      />
    </div>
  )
}
