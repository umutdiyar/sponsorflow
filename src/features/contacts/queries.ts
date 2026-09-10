import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { ActivityChannel } from "@/generated/prisma/enums"
import {
  listCompanyOptions,
  listMembers,
  type CompanyRef,
  type MemberRef,
} from "@/lib/org/reference"
import { lastContactByContact } from "@/features/activities/queries"
import {
  COMM_STALE_DAYS,
  COMM_STATUSES,
  COMM_STATUS_LABELS,
  deriveCommStatus,
  type CommStatus,
} from "@/features/activities/comm-status"
import { addDaysToKey, istanbulDayKey, parseIstanbulDate } from "@/lib/format"

// Backwards-compatible aliases (the shared derivation now lives in comm-status).
export const CONTACT_COMM_STATUSES = COMM_STATUSES
export const CONTACT_COMM_STATUS_LABELS = COMM_STATUS_LABELS
export type ContactCommStatus = CommStatus

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
  companyOwnerMembershipId: string | null
  lastContactAt: Date | null
  lastContactChannel: ActivityChannel | null
  commStatus: ContactCommStatus
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
      ownerMembershipId: true,
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
  /** membership id, or "unassigned" */
  owner?: string
  commStatus?: string
}

export type ContactsPageData = {
  contacts: ContactRow[]
  companies: CompanyRef[]
  members: MemberRef[]
}

export async function getContactsPageData(
  params: ContactsPageParams
): Promise<ContactsPageData> {
  const q = params.q?.trim()
  const todayKey = istanbulDayKey(new Date())
  const tomorrowStart = parseIstanbulDate(addDaysToKey(todayKey, 1))!
  const staleBefore = parseIstanbulDate(
    addDaysToKey(todayKey, -COMM_STALE_DAYS)
  )!

  const companyFilter: Prisma.CompanyWhereInput = {}
  if (params.owner === "unassigned") companyFilter.ownerMembershipId = null
  else if (params.owner) companyFilter.ownerMembershipId = params.owner

  const where: Prisma.ContactWhereInput = {
    organizationId: params.organizationId,
    archivedAt: null,
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(Object.keys(companyFilter).length ? { company: companyFilter } : {}),
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

  const [rows, companies, members] = await Promise.all([
    prisma.contact.findMany({
      where,
      select: rowSelect,
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
      take: 500,
    }),
    listCompanyOptions(params.organizationId),
    listMembers(params.organizationId),
  ])

  const contactIds = rows.map((r) => r.id)
  const companyIds = [...new Set(rows.map((r) => r.companyId))]

  const [lastContact, directionRows, overdueGroups] = await Promise.all([
    lastContactByContact(params.organizationId, contactIds),
    contactIds.length
      ? prisma.activity.findMany({
          where: {
            organizationId: params.organizationId,
            contactId: { in: contactIds },
            channel: { not: "INTERNAL" },
            direction: { in: ["OUTBOUND", "INBOUND"] },
          },
          select: { contactId: true, direction: true, occurredAt: true },
          orderBy: { occurredAt: "desc" },
          take: 4000,
        })
      : Promise.resolve([]),
    companyIds.length
      ? prisma.opportunity.groupBy({
          by: ["companyId"],
          where: {
            organizationId: params.organizationId,
            archivedAt: null,
            companyId: { in: companyIds },
            nextActionAt: { lt: tomorrowStart },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])

  const lastOut = new Map<string, Date>()
  const lastIn = new Map<string, Date>()
  for (const r of directionRows) {
    if (!r.contactId) continue
    const map = r.direction === "OUTBOUND" ? lastOut : lastIn
    if (!map.has(r.contactId)) map.set(r.contactId, r.occurredAt)
  }
  const overdueCompanies = new Set(overdueGroups.map((g) => g.companyId))

  const deriveStatus = (contactId: string, companyId: string) =>
    deriveCommStatus({
      lastOutboundAt: lastOut.get(contactId),
      lastInboundAt: lastIn.get(contactId),
      hasOverdueFollowUp: overdueCompanies.has(companyId),
      staleBefore,
    })

  let contacts: ContactRow[] = rows.map((r) => {
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
      companyOwnerMembershipId: r.company.ownerMembershipId,
      lastContactAt: lc?.at ?? null,
      lastContactChannel: lc?.channel ?? null,
      commStatus: deriveStatus(r.id, r.companyId),
    }
  })

  if (
    params.commStatus &&
    (CONTACT_COMM_STATUSES as readonly string[]).includes(params.commStatus)
  ) {
    contacts = contacts.filter((c) => c.commStatus === params.commStatus)
  }

  return { contacts, companies, members }
}
