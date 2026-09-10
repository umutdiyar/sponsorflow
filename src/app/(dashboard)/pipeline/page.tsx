import type { Metadata } from "next"
import Link from "next/link"
import { GitBranchIcon, PlusIcon } from "lucide-react"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { listCompanyOptions, listMembers } from "@/lib/org/reference"
import { PipelineBoard } from "@/features/opportunities/components/pipeline-board"
import {
  getPipelineBoardData,
  listOpportunityOptions,
} from "@/features/opportunities/queries"

export const metadata: Metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const membership = await requirePermission("opportunity:read")

  const [{ stages, opportunities }, members, companies, opportunityOptions] =
    await Promise.all([
      getPipelineBoardData(membership.organizationId),
      listMembers(membership.organizationId),
      listCompanyOptions(membership.organizationId),
      listOpportunityOptions(membership.organizationId),
    ])

  const canCreate = hasPermission(membership.role, "opportunity:create")
  const canMove = hasPermission(membership.role, "pipeline:update")

  return (
    <div className="mx-auto flex max-w-full flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Pipeline"
        description="Sponsorluk süreçlerini aşamalar arasında sürükleyerek hattı yönet."
        actions={
          canCreate ? (
            <Button
              render={<Link href="/opportunities?new=1" />}
              nativeButton={false}
            >
              <PlusIcon />
              Yeni Süreç
            </Button>
          ) : undefined
        }
      />

      {stages.length === 0 ? (
        <EmptyState
          icon={GitBranchIcon}
          title="Pipeline aşaması tanımlı değil."
          description="Aşamalar organizasyon kurulumuyla birlikte oluşturulur."
        />
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={GitBranchIcon}
          title="Pipeline henüz boş."
          description="Süreç ekledikçe aşamalara göre buraya dizilecek."
          action={
            canCreate ? (
              <Button
                render={<Link href="/opportunities?new=1" />}
                nativeButton={false}
              >
                <PlusIcon />
                Yeni Süreç
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PipelineBoard
          stages={stages}
          opportunities={opportunities}
          canMove={canMove}
          members={members}
          companies={companies}
          opportunityOptions={opportunityOptions}
          can={{
            update: hasPermission(membership.role, "opportunity:update"),
            changeStage: canMove,
            createActivity: hasPermission(membership.role, "activity:create"),
            createTask: hasPermission(membership.role, "task:create"),
          }}
        />
      )}
    </div>
  )
}
