import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { getPackagesPageData } from "@/features/packages/queries"
import { PackagesView } from "@/features/packages/components/packages-view"

export const metadata: Metadata = { title: "Sponsorluk Paketleri" }

export default async function PackagesPage() {
  const membership = await requirePermission("package:read")
  const packages = await getPackagesPageData(membership.organizationId, {
    includeArchived: true,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Sponsorluk Paketleri"
        description="Sponsorluk seviyelerini ve sağlanan avantajları buradan yönet."
      />

      <PackagesView
        packages={packages}
        canCreate={hasPermission(membership.role, "package:create")}
        canUpdate={hasPermission(membership.role, "package:update")}
        canArchive={hasPermission(membership.role, "package:archive")}
      />
    </div>
  )
}
