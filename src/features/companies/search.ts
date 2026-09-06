"use server"

import { prisma } from "@/lib/db/prisma"
import { getCurrentMembership, requirePermission } from "@/lib/auth/membership"
import {
  getCompanyQuickView,
  type CompanyQuickView,
} from "@/features/companies/queries"

export type CompanySearchHit = {
  id: string
  name: string
  industry: string | null
}

/** On-demand data for the company quick-view Sheet. */
export async function fetchCompanyQuickView(
  companyId: string
): Promise<CompanyQuickView | null> {
  const membership = await requirePermission("company:read")
  return getCompanyQuickView(membership.organizationId, companyId)
}

/**
 * Type-ahead company lookup for the command palette. One indexed, org-scoped
 * query capped at 8 rows — not a search backend, just a shortcut to a company.
 */
export async function quickSearchCompanies(
  query: string
): Promise<CompanySearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const membership = await getCurrentMembership()

  return prisma.company.findMany({
    where: {
      organizationId: membership.organizationId,
      archivedAt: null,
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, industry: true },
    orderBy: { name: "asc" },
    take: 8,
  })
}
