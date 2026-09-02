import "server-only"

import { prisma } from "@/lib/db/prisma"

export type PackageRow = {
  id: string
  name: string
  description: string | null
  price: number | null
  currency: string
  benefits: string[]
  position: number
  isActive: boolean
  archivedAt: Date | null
  opportunityCount: number
  createdAt: Date
  updatedAt: Date
}

export async function getPackagesPageData(
  organizationId: string,
  opts: { includeArchived?: boolean } = {}
): Promise<PackageRow[]> {
  const rows = await prisma.sponsorshipPackage.findMany({
    where: {
      organizationId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      benefits: true,
      position: true,
      isActive: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { opportunities: true } },
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  })

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    currency: r.currency,
    benefits: r.benefits,
    position: r.position,
    isActive: r.isActive,
    archivedAt: r.archivedAt,
    opportunityCount: r._count.opportunities,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}
