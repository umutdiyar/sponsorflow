import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { OpportunitiesView } from "@/features/opportunities/components/opportunities-view"
import {
  getOpportunitiesPageData,
  type OpportunityStatus,
} from "@/features/opportunities/queries"

export const metadata: Metadata = { title: "Sponsorluk Süreçleri" }

const VALID_STATUS = new Set<OpportunityStatus>([
  "open",
  "won",
  "lost",
  "archived",
  "all",
])

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    stage?: string
    owner?: string
    package?: string
    status?: string
  }>
}) {
  const membership = await requirePermission("opportunity:read")
  const sp = await searchParams

  const status =
    sp.status && VALID_STATUS.has(sp.status as OpportunityStatus)
      ? (sp.status as OpportunityStatus)
      : "open"

  const data = await getOpportunitiesPageData({
    organizationId: membership.organizationId,
    q: sp.q,
    stageId: sp.stage,
    ownerMembershipId: sp.owner,
    packageId: sp.package,
    status,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Sponsorluk Süreçleri"
        description="Firmalarla yürüyen sponsorluk süreçlerini ve aşamalarını takip et."
      />

      <OpportunitiesView
        opportunities={data.opportunities}
        stages={data.stages}
        members={data.members}
        packages={data.packages}
        companies={data.companies}
        filters={{
          q: sp.q ?? "",
          stage: sp.stage ?? "",
          owner: sp.owner ?? "",
          package: sp.package ?? "",
          status,
        }}
        canCreate={hasPermission(membership.role, "opportunity:create")}
        can={{
          update: hasPermission(membership.role, "opportunity:update"),
          changeStage: hasPermission(membership.role, "pipeline:update"),
          createActivity: hasPermission(membership.role, "activity:create"),
          createTask: hasPermission(membership.role, "task:create"),
        }}
      />
    </div>
  )
}
