import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { listCompanyOptions, type CompanyRef } from "@/lib/org/reference"

export type ContactRow = {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  department: string | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  notes: string | null
  isPrimary: boolean
  updatedAt: Date
  companyId: string
  companyName: string
}

const rowSelect = {
  id: true,
  firstName: true,
  lastName: true,
  jobTitle: true,
  department: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  notes: true,
  isPrimary: true,
  updatedAt: true,
  companyId: true,
  company: { select: { name: true } },
} satisfies Prisma.ContactSelect

export type ContactsPageParams = {
  organizationId: string
  q?: string
  companyId?: string
}

export type ContactsPageData = {
  contacts: ContactRow[]
  companies: CompanyRef[]
}

export async function getContactsPageData(
  params: ContactsPageParams
): Promise<ContactsPageData> {
  const q = params.q?.trim()

  const where: Prisma.ContactWhereInput = {
    organizationId: params.organizationId,
    archivedAt: null,
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  const [rows, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: rowSelect,
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
      take: 500,
    }),
    listCompanyOptions(params.organizationId),
  ])

  return {
    contacts: rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      jobTitle: r.jobTitle,
      department: r.department,
      email: r.email,
      phone: r.phone,
      linkedinUrl: r.linkedinUrl,
      notes: r.notes,
      isPrimary: r.isPrimary,
      updatedAt: r.updatedAt,
      companyId: r.companyId,
      companyName: r.company.name,
    })),
    companies,
  }
}
