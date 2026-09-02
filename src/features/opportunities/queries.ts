import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { PipelineStageType } from "@/generated/prisma/enums"
import {
  listActivePackages,
  listCompanyOptions,
  listMembers,
  listStages,
  type CompanyRef,
  type MemberRef,
  type PackageRef,
  type StageRef,
} from "@/lib/org/reference"

export type OpportunityStatus = "open" | "won" | "lost" | "archived" | "all"

export type OpportunityRow = {
  id: string
  title: string
  companyId: string
  companyName: string
  stage: { id: string; name: string; key: string; type: PipelineStageType }
  owner: { membershipId: string; name: string } | null
  packageName: string | null
  estimatedValue: number | null
  currency: string
  probability: number | null
  nextAction: string | null
  nextActionAt: Date | null
  expectedCloseDate: Date | null
  lastActivityAt: Date | null
  updatedAt: Date
  archivedAt: Date | null
}

function memberName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email
}

const rowSelect = {
  id: true,
  title: true,
  companyId: true,
  estimatedValue: true,
  currency: true,
  probability: true,
  nextAction: true,
  nextActionAt: true,
  expectedCloseDate: true,
  updatedAt: true,
  archivedAt: true,
  company: { select: { name: true } },
  stage: { select: { id: true, name: true, key: true, type: true } },
  owner: {
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
  },
  package: { select: { name: true } },
} satisfies Prisma.OpportunitySelect

type RawRow = Prisma.OpportunityGetPayload<{ select: typeof rowSelect }>

function toRow(row: RawRow, lastActivityAt: Date | null): OpportunityRow {
  return {
    id: row.id,
    title: row.title,
    companyId: row.companyId,
    companyName: row.company.name,
    stage: row.stage,
    owner: row.owner
      ? {
          membershipId: row.owner.id,
          name: memberName(row.owner.profile),
        }
      : null,
    packageName: row.package?.name ?? null,
    estimatedValue: row.estimatedValue,
    currency: row.currency,
    probability: row.probability,
    nextAction: row.nextAction,
    nextActionAt: row.nextActionAt,
    expectedCloseDate: row.expectedCloseDate,
    lastActivityAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
  }
}

async function lastActivityMap(
  organizationId: string,
  opportunityIds: string[]
): Promise<Map<string, Date>> {
  if (opportunityIds.length === 0) return new Map()
  const grouped = await prisma.activity.groupBy({
    by: ["opportunityId"],
    where: { organizationId, opportunityId: { in: opportunityIds } },
    _max: { occurredAt: true },
  })
  const map = new Map<string, Date>()
  for (const g of grouped) {
    if (g.opportunityId && g._max.occurredAt) {
      map.set(g.opportunityId, g._max.occurredAt)
    }
  }
  return map
}

function statusWhere(status: OpportunityStatus): Prisma.OpportunityWhereInput {
  switch (status) {
    case "all":
      return {}
    case "archived":
      return { archivedAt: { not: null } }
    case "won":
      return { archivedAt: null, stage: { type: "WON" } }
    case "lost":
      return { archivedAt: null, stage: { type: "LOST" } }
    case "open":
    default:
      return { archivedAt: null }
  }
}

export type OpportunitiesPageParams = {
  organizationId: string
  q?: string
  stageId?: string
  ownerMembershipId?: string
  packageId?: string
  status?: OpportunityStatus
}

export type OpportunitiesPageData = {
  opportunities: OpportunityRow[]
  stages: StageRef[]
  members: MemberRef[]
  packages: PackageRef[]
  companies: CompanyRef[]
}

export async function getOpportunitiesPageData(
  params: OpportunitiesPageParams
): Promise<OpportunitiesPageData> {
  const status = params.status ?? "open"
  const q = params.q?.trim()

  const where: Prisma.OpportunityWhereInput = {
    organizationId: params.organizationId,
    ...statusWhere(status),
    ...(params.stageId ? { stageId: params.stageId } : {}),
    ...(params.ownerMembershipId
      ? { ownerMembershipId: params.ownerMembershipId }
      : {}),
    ...(params.packageId ? { packageId: params.packageId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  }

  // The list table doesn't show "last activity", so skip that extra round-trip.
  const [rows, stages, members, packages, companies] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      select: rowSelect,
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    }),
    listStages(params.organizationId),
    listMembers(params.organizationId),
    listActivePackages(params.organizationId),
    listCompanyOptions(params.organizationId),
  ])

  return {
    opportunities: rows.map((r) => toRow(r, null)),
    stages,
    members,
    packages,
    companies,
  }
}

export type PipelineBoardData = {
  stages: StageRef[]
  opportunities: OpportunityRow[]
}

/** Every open opportunity + the stage list, for the Kanban board. */
export async function getPipelineBoardData(
  organizationId: string
): Promise<PipelineBoardData> {
  const [rows, stages] = await Promise.all([
    prisma.opportunity.findMany({
      where: { organizationId, archivedAt: null },
      select: rowSelect,
      orderBy: [{ updatedAt: "desc" }],
      take: 1000,
    }),
    listStages(organizationId),
  ])

  const activity = await lastActivityMap(
    organizationId,
    rows.map((r) => r.id)
  )

  return {
    stages,
    opportunities: rows.map((r) => toRow(r, activity.get(r.id) ?? null)),
  }
}

export type OpportunityOption = {
  id: string
  title: string
  companyId: string
  companyName: string
}

/** Lightweight open-opportunity list for task / activity link selects. */
export async function listOpportunityOptions(
  organizationId: string
): Promise<OpportunityOption[]> {
  const rows = await prisma.opportunity.findMany({
    where: { organizationId, archivedAt: null },
    select: {
      id: true,
      title: true,
      companyId: true,
      company: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  })
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    companyId: r.companyId,
    companyName: r.company.name,
  }))
}

export type OpportunityDetail = {
  id: string
  title: string
  organizationId: string
  companyId: string
  companyName: string
  companyIndustry: string | null
  stage: { id: string; name: string; key: string; type: PipelineStageType }
  owner: { membershipId: string; name: string } | null
  ownerMembershipId: string
  packageId: string | null
  packageName: string | null
  estimatedValue: number | null
  currency: string
  probability: number | null
  nextAction: string | null
  nextActionAt: Date | null
  expectedCloseDate: Date | null
  lostReason: string | null
  createdByName: string
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
  openTaskCount: number
  activityCount: number
}

export async function getOpportunityById(
  organizationId: string,
  id: string
): Promise<OpportunityDetail | null> {
  const row = await prisma.opportunity.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      title: true,
      organizationId: true,
      companyId: true,
      ownerMembershipId: true,
      packageId: true,
      estimatedValue: true,
      currency: true,
      probability: true,
      nextAction: true,
      nextActionAt: true,
      expectedCloseDate: true,
      lostReason: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
      company: { select: { name: true, industry: true } },
      stage: { select: { id: true, name: true, key: true, type: true } },
      owner: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true } },
        },
      },
      package: { select: { name: true } },
      createdBy: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
      _count: {
        select: {
          activities: true,
          tasks: { where: { archivedAt: null, status: { not: "DONE" } } },
        },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    title: row.title,
    organizationId: row.organizationId,
    companyId: row.companyId,
    companyName: row.company.name,
    companyIndustry: row.company.industry,
    stage: row.stage,
    owner: row.owner
      ? { membershipId: row.owner.id, name: memberName(row.owner.profile) }
      : null,
    ownerMembershipId: row.ownerMembershipId,
    packageId: row.packageId,
    packageName: row.package?.name ?? null,
    estimatedValue: row.estimatedValue,
    currency: row.currency,
    probability: row.probability,
    nextAction: row.nextAction,
    nextActionAt: row.nextActionAt,
    expectedCloseDate: row.expectedCloseDate,
    lostReason: row.lostReason,
    createdByName: memberName(row.createdBy.profile),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archivedAt: row.archivedAt,
    openTaskCount: row._count.tasks,
    activityCount: row._count.activities,
  }
}
