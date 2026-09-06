import "server-only"

import { prisma } from "@/lib/db/prisma"
import type {
  ActivityChannel,
  ActivityDirection,
  ActivityKind,
} from "@/generated/prisma/enums"
import type { Prisma } from "@/generated/prisma/client"

export type ActivityListItem = {
  id: string
  channel: ActivityChannel
  kind: ActivityKind
  direction: ActivityDirection
  title: string | null
  description: string | null
  occurredAt: Date
  createdAt: Date
  author: string
  companyId: string
  companyName: string
  opportunityId: string | null
  opportunityTitle: string | null
  contactName: string | null
}

function memberName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email
}

const listSelect = {
  id: true,
  channel: true,
  kind: true,
  direction: true,
  title: true,
  description: true,
  occurredAt: true,
  createdAt: true,
  companyId: true,
  opportunityId: true,
  company: { select: { name: true } },
  opportunity: { select: { title: true } },
  contact: { select: { firstName: true, lastName: true } },
  createdBy: {
    select: { profile: { select: { fullName: true, email: true } } },
  },
} satisfies Prisma.ActivitySelect

type RawRow = Prisma.ActivityGetPayload<{ select: typeof listSelect }>

function toItem(row: RawRow): ActivityListItem {
  return {
    id: row.id,
    channel: row.channel,
    kind: row.kind,
    direction: row.direction,
    title: row.title,
    description: row.description,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
    author: memberName(row.createdBy.profile),
    companyId: row.companyId,
    companyName: row.company.name,
    opportunityId: row.opportunityId,
    opportunityTitle: row.opportunity?.title ?? null,
    contactName: row.contact
      ? `${row.contact.firstName} ${row.contact.lastName}`.trim()
      : null,
  }
}

export async function listOpportunityActivities(
  organizationId: string,
  opportunityId: string,
  take = 100
): Promise<ActivityListItem[]> {
  const rows = await prisma.activity.findMany({
    where: { organizationId, opportunityId },
    select: listSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  })
  return rows.map(toItem)
}

export async function listCompanyActivities(
  organizationId: string,
  companyId: string,
  take = 100
): Promise<ActivityListItem[]> {
  const rows = await prisma.activity.findMany({
    where: { organizationId, companyId },
    select: listSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  })
  return rows.map(toItem)
}

export type ActivityFeedFilters = {
  organizationId: string
  channel?: string
  kind?: string
  direction?: string
  memberId?: string
  companyId?: string
  from?: string
  to?: string
  cursor?: string
  take?: number
}

export type ActivityFeedResult = {
  items: ActivityListItem[]
  nextCursor: string | null
}

const CHANNEL_SET = new Set<ActivityChannel>([
  "EMAIL",
  "LINKEDIN",
  "WHATSAPP",
  "PHONE",
  "MEETING",
  "OTHER",
  "INTERNAL",
])
const KIND_SET = new Set<ActivityKind>([
  "INITIAL_CONTACT",
  "FOLLOW_UP",
  "RESPONSE",
  "PROPOSAL",
  "MEETING_NOTE",
  "NOTE",
  "STAGE_CHANGE",
])
const DIRECTION_SET = new Set<ActivityDirection>([
  "OUTBOUND",
  "INBOUND",
  "INTERNAL",
])

export async function getActivitiesFeed(
  filters: ActivityFeedFilters
): Promise<ActivityFeedResult> {
  const take = Math.min(filters.take ?? 50, 100)

  const where: Prisma.ActivityWhereInput = {
    organizationId: filters.organizationId,
  }
  if (filters.channel && CHANNEL_SET.has(filters.channel as ActivityChannel)) {
    where.channel = filters.channel as ActivityChannel
  }
  if (filters.kind && KIND_SET.has(filters.kind as ActivityKind)) {
    where.kind = filters.kind as ActivityKind
  }
  if (
    filters.direction &&
    DIRECTION_SET.has(filters.direction as ActivityDirection)
  ) {
    where.direction = filters.direction as ActivityDirection
  }
  if (filters.memberId) where.createdByMembershipId = filters.memberId
  if (filters.companyId) where.companyId = filters.companyId
  if (filters.from || filters.to) {
    where.occurredAt = {}
    if (filters.from) where.occurredAt.gte = new Date(filters.from)
    if (filters.to) where.occurredAt.lte = new Date(filters.to)
  }

  const rows = await prisma.activity.findMany({
    where,
    select: listSelect,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > take
  const page = hasMore ? rows.slice(0, take) : rows

  return {
    items: page.map(toItem),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  }
}

export async function listRecentActivities(
  organizationId: string,
  take = 6
): Promise<ActivityListItem[]> {
  const rows = await prisma.activity.findMany({
    where: { organizationId },
    select: listSelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
  })
  return rows.map(toItem)
}

export type LastContact = { at: Date; channel: ActivityChannel }

/**
 * Latest *external* (non-INTERNAL) contact per company, derived from the
 * activity log — no denormalized column. One indexed query, reduced in memory.
 */
export async function lastContactByCompany(
  organizationId: string,
  companyIds: string[]
): Promise<Map<string, LastContact>> {
  const ids = [...new Set(companyIds)].filter(Boolean)
  if (ids.length === 0) return new Map()

  const rows = await prisma.activity.findMany({
    where: {
      organizationId,
      companyId: { in: ids },
      channel: { not: "INTERNAL" },
    },
    select: { companyId: true, occurredAt: true, channel: true },
    orderBy: { occurredAt: "desc" },
    take: 4000,
  })

  const map = new Map<string, LastContact>()
  for (const r of rows) {
    if (!map.has(r.companyId)) {
      map.set(r.companyId, { at: r.occurredAt, channel: r.channel })
    }
  }
  return map
}

/** Same as above but keyed by contact id. */
export async function lastContactByContact(
  organizationId: string,
  contactIds: string[]
): Promise<Map<string, LastContact>> {
  const ids = [...new Set(contactIds)].filter(Boolean)
  if (ids.length === 0) return new Map()

  const rows = await prisma.activity.findMany({
    where: {
      organizationId,
      contactId: { in: ids },
      channel: { not: "INTERNAL" },
    },
    select: { contactId: true, occurredAt: true, channel: true },
    orderBy: { occurredAt: "desc" },
    take: 4000,
  })

  const map = new Map<string, LastContact>()
  for (const r of rows) {
    if (r.contactId && !map.has(r.contactId)) {
      map.set(r.contactId, { at: r.occurredAt, channel: r.channel })
    }
  }
  return map
}
