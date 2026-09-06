import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { ActivityChannel } from "@/generated/prisma/enums"
import { listCompanyOptions, type CompanyRef } from "@/lib/org/reference"
import { lastContactByContact } from "@/features/activities/queries"

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
  companyOwnerName: string | null
  lastContactAt: Date | null
  lastContactChannel: ActivityChannel | null
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
  company: {
    select: {
      name: true,
      owner: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
    },
  },
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

  const lastContact = await lastContactByContact(
    params.organizationId,
    rows.map((r) => r.id)
  )

  return {
    contacts: rows.map((r) => {
      const lc = lastContact.get(r.id) ?? null
      return {
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
        companyOwnerName: r.company.owner
          ? r.company.owner.profile.fullName?.trim() ||
            r.company.owner.profile.email
          : null,
        lastContactAt: lc?.at ?? null,
        lastContactChannel: lc?.channel ?? null,
      }
    }),
    companies,
  }
}
