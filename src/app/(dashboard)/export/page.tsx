import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { prisma } from "@/lib/db/prisma"
import { PageHeader } from "@/components/common/page-header"
import { listOrgMembers } from "@/features/companies/queries"
import { getCurrentFocusCompanyIds } from "@/features/weekly-focus/queries"
import { ExportPanel } from "@/features/export/components/export-panel"

export const metadata: Metadata = { title: "Dışa Aktar" }

export default async function ExportPage() {
  const membership = await requirePermission("data:export")

  const [members, industryRows, focusIds] = await Promise.all([
    listOrgMembers(membership.organizationId),
    prisma.company.findMany({
      where: {
        organizationId: membership.organizationId,
        archivedAt: null,
        NOT: { industry: null },
      },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    getCurrentFocusCompanyIds(membership.organizationId),
  ])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dışa Aktar"
        description="Firmaları, kişileri ve fırsatları raporlama için indir."
      />
      <ExportPanel
        members={members}
        industries={industryRows
          .map((r) => r.industry)
          .filter((v): v is string => Boolean(v))}
        hasFocus={focusIds.length > 0}
      />
    </div>
  )
}
