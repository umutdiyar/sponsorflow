import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { listCompanyOptions } from "@/lib/org/reference"
import { listOpportunityOptions } from "@/features/opportunities/queries"
import {
  getAgendaTasks,
  getTasksPageData,
  type TaskScope,
} from "@/features/tasks/queries"
import { TasksView } from "@/features/tasks/components/tasks-view"

export const metadata: Metadata = { title: "Görevler" }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    scope?: string
    status?: string
    priority?: string
    q?: string
  }>
}) {
  const membership = await requirePermission("task:read")
  const sp = await searchParams

  const view = sp.view === "plan" ? "plan" : "liste"
  const scope: TaskScope = sp.scope === "all" ? "all" : "mine"

  const params = {
    organizationId: membership.organizationId,
    currentMembershipId: membership.membershipId,
    scope,
    status: sp.status,
    priority: sp.priority,
    q: sp.q,
  }

  const [data, companies, opportunities] = await Promise.all([
    view === "plan" ? getAgendaTasks(params) : getTasksPageData(params),
    listCompanyOptions(membership.organizationId),
    listOpportunityOptions(membership.organizationId),
  ])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Görevler"
        description="Takip edilmesi gereken işleri ve sponsorluk aksiyonlarını planla."
      />

      <TasksView
        tasks={data.tasks}
        members={data.members}
        companies={companies}
        opportunities={opportunities}
        filters={{
          view,
          scope,
          status: sp.status ?? "",
          priority: sp.priority ?? "",
          q: sp.q ?? "",
        }}
        canCreate={hasPermission(membership.role, "task:create")}
        canUpdate={hasPermission(membership.role, "task:update")}
        canArchive={hasPermission(membership.role, "task:archive")}
      />
    </div>
  )
}
