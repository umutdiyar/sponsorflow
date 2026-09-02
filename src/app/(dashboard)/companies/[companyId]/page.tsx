import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import {
  getCompanyById,
  listOrgMembers,
} from "@/features/companies/queries"
import { CompanyDetailView } from "@/features/companies/components/company-detail-view"

type Params = { params: Promise<{ companyId: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { companyId } = await params
  const membership = await requirePermission("company:read")
  const company = await getCompanyById(membership.organizationId, companyId)
  return { title: company?.name ?? "Firma" }
}

export default async function CompanyDetailPage({ params }: Params) {
  const { companyId } = await params
  const membership = await requirePermission("company:read")

  const [company, members] = await Promise.all([
    getCompanyById(membership.organizationId, companyId),
    listOrgMembers(membership.organizationId),
  ])
  if (!company) notFound()

  return (
    <CompanyDetailView
      company={company}
      members={members}
      can={{
        update: hasPermission(membership.role, "company:update"),
        archive: hasPermission(membership.role, "company:archive"),
        createContact: hasPermission(membership.role, "contact:create"),
      }}
    />
  )
}
