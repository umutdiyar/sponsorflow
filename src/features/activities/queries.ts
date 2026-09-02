import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { ActivityType } from "@/generated/prisma/enums"
import type { Prisma } from "@/generated/prisma/client"

export type ActivityListItem = {
  id: string
  type: ActivityType
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
  type: true,
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

function toItem(row: {
  id: string
  type: ActivityType
  title: string | null
  description: string | null
  occurredAt: Date
  createdAt: Date
  companyId: string
  opportunityId: string | null
  company: { name: string }
  opportunity: { title: string } | null
  contact: { firstName: string; lastName: string } | null
  createdBy: { profile: { fullName: string | null; email: string } }
}): ActivityListItem {
  return {
    id: row.id,
    type: row.type,
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

/** Timeline for one opportunity (most recent first, capped). */
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

/** Timeline for a company (all activities on it, capped). */
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
  type?: string
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

const ACTIVITY_TYPE_SET = new Set<ActivityType>([
  "EMAIL",
  "PHONE",
  "MEETING",
  "LINKEDIN",
  "WHATSAPP",
  "NOTE",
  "PROPOSAL",
  "FOLLOW_UP",
  "STAGE_CHANGE",
])

/** Global activity feed with filters + keyset pagination on `occurredAt`. */
export async function getActivitiesFeed(
  filters: ActivityFeedFilters
): Promise<ActivityFeedResult> {
  const take = Math.min(filters.take ?? 50, 100)

  const where: Prisma.ActivityWhereInput = {
    organizationId: filters.organizationId,
  }
  if (filters.type && ACTIVITY_TYPE_SET.has(filters.type as ActivityType)) {
    where.type = filters.type as ActivityType
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
    ...(filters.cursor
      ? { cursor: { id: filters.cursor }, skip: 1 }
      : {}),
  })

  const hasMore = rows.length > take
  const page = hasMore ? rows.slice(0, take) : rows

  return {
    items: page.map(toItem),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  }
}

/** A few recent activities for the dashboard. */
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
