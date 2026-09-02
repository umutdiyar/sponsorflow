import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import {
  listActivePackages,
  listCompanyOptions,
  listContactOptions,
  listMembers,
  listStages,
} from "@/lib/org/reference"
import {
  getOpportunityById,
} from "@/features/opportunities/queries"
import { listOpportunityActivities } from "@/features/activities/queries"
import { listOpportunityTasks } from "@/features/tasks/queries"
import { OpportunityDetailView } from "@/features/opportunities/components/opportunity-detail-view"

type Params = { params: Promise<{ opportunityId: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { opportunityId } = await params
  const membership = await requirePermission("opportunity:read")
  const opp = await getOpportunityById(
    membership.organizationId,
    opportunityId
  )
  return { title: opp ? `${opp.title} · ${opp.companyName}` : "Fırsat" }
}

export default async function OpportunityDetailPage({ params }: Params) {
  const { opportunityId } = await params
  const membership = await requirePermission("opportunity:read")
  const orgId = membership.organizationId

  const opportunity = await getOpportunityById(orgId, opportunityId)
  if (!opportunity) notFound()

  const [activities, tasks, contacts, members, stages, packages, companies] =
    await Promise.all([
      listOpportunityActivities(orgId, opportunityId),
      listOpportunityTasks(orgId, opportunityId),
      listContactOptions(orgId, opportunity.companyId),
      listMembers(orgId),
      listStages(orgId),
      listActivePackages(orgId),
      listCompanyOptions(orgId),
    ])

  return (
    <OpportunityDetailView
      opportunity={opportunity}
      activities={activities}
      tasks={tasks}
      contacts={contacts}
      members={members}
      stages={stages}
      packages={packages}
      companies={companies}
      can={{
        update: hasPermission(membership.role, "opportunity:update"),
        changeStage: hasPermission(membership.role, "pipeline:update"),
        archive: hasPermission(membership.role, "opportunity:archive"),
        createActivity: hasPermission(membership.role, "activity:create"),
        createTask: hasPermission(membership.role, "task:create"),
      }}
    />
  )
}
