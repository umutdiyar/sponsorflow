import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { CompaniesView } from "@/features/companies/components/companies-view"
import {
  getCompaniesPageData,
  type CompanyListSort,
} from "@/features/companies/queries"

export const metadata: Metadata = { title: "Firmalar" }

const VALID_SORTS = new Set<CompanyListSort>([
  "name",
  "-name",
  "updated",
  "-updated",
  "created",
  "-created",
])

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    industry?: string
    owner?: string
    sort?: string
  }>
}) {
  const membership = await requirePermission("company:read")
  const sp = await searchParams

  const sort =
    sp.sort && VALID_SORTS.has(sp.sort as CompanyListSort)
      ? (sp.sort as CompanyListSort)
      : "-updated"

  const { companies, industries, members } = await getCompaniesPageData({
    organizationId: membership.organizationId,
    q: sp.q,
    industry: sp.industry,
    ownerMembershipId: sp.owner,
    sort,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Firmalar"
        description="Sponsorluk sürecindeki firmaları tek yerden takip et."
      />

      <CompaniesView
        companies={companies}
        industries={industries}
        members={members}
        filters={{
          q: sp.q ?? "",
          industry: sp.industry ?? "",
          owner: sp.owner ?? "",
        }}
        can={{
          create: hasPermission(membership.role, "company:create"),
          update: hasPermission(membership.role, "company:update"),
          archive: hasPermission(membership.role, "company:archive"),
        }}
      />
    </div>
  )
}
