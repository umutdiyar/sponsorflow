"use server"

import { prisma } from "@/lib/db/prisma"
import { getCurrentMembership } from "@/lib/auth/membership"

export type CompanySearchHit = {
  id: string
  name: string
  industry: string | null
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
