import type { Metadata } from "next"
import Link from "next/link"
import { GitBranchIcon, PlusIcon } from "lucide-react"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { PipelineBoard } from "@/features/opportunities/components/pipeline-board"
import { getPipelineBoardData } from "@/features/opportunities/queries"

export const metadata: Metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const membership = await requirePermission("opportunity:read")
  const { stages, opportunities } = await getPipelineBoardData(
    membership.organizationId
  )
  const canCreate = hasPermission(membership.role, "opportunity:create")
  const canMove = hasPermission(membership.role, "pipeline:update")

  return (
    <div className="mx-auto flex max-w-full flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Pipeline"
        description="Fırsatları aşamalar arasında sürükleyerek sponsorluk hattını yönet."
        actions={
          canCreate ? (
            <Button render={<Link href="/opportunities?new=1" />} nativeButton={false}>
              <PlusIcon />
              Fırsat Ekle
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
          description="Fırsat ekledikçe aşamalara göre buraya dizilecek."
          action={
            canCreate ? (
              <Button
                render={<Link href="/opportunities?new=1" />}
                nativeButton={false}
              >
                <PlusIcon />
                Fırsat Ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PipelineBoard
          stages={stages}
          opportunities={opportunities}
          canMove={canMove}
        />
      )}
    </div>
  )
}
