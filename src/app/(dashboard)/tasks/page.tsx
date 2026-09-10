import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { listCompanyOptions } from "@/lib/org/reference"
import { listOpportunityOptions } from "@/features/opportunities/queries"
import { getAgendaTasks, type TaskScope } from "@/features/tasks/queries"
import { Planner } from "@/features/tasks/components/planner"

export const metadata: Metadata = { title: "Planlama" }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const membership = await requirePermission("task:read")
  const sp = await searchParams
  const scope: TaskScope = sp.scope === "all" ? "all" : "mine"

  const params = {
    organizationId: membership.organizationId,
    currentMembershipId: membership.membershipId,
    scope,
  }

  const [data, companies, opportunities] = await Promise.all([
    getAgendaTasks(params),
    listCompanyOptions(membership.organizationId),
    listOpportunityOptions(membership.organizationId),
  ])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Planlama"
        description="Takipleri, görüşmeleri ve yapılacak işleri haftalık planla."
      />

      <Planner
        tasks={data.tasks}
        members={data.members}
        companies={companies}
        opportunities={opportunities}
        scope={scope}
        canCreate={hasPermission(membership.role, "task:create")}
        canUpdate={hasPermission(membership.role, "task:update")}
        canArchive={hasPermission(membership.role, "task:archive")}
      />
    </div>
  )
}
