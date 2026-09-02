import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums"
import { listMembers, type MemberRef } from "@/lib/org/reference"

export type TaskScope = "mine" | "all"

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee: { membershipId: string; name: string } | null
  assignedToMembershipId: string
  companyId: string | null
  companyName: string | null
  opportunityId: string | null
  opportunityTitle: string | null
  dueAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function memberName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email
}

const rowSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assignedToMembershipId: true,
  companyId: true,
  opportunityId: true,
  dueAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
  },
  company: { select: { name: true } },
  opportunity: { select: { title: true } },
} satisfies Prisma.TaskSelect

type RawRow = Prisma.TaskGetPayload<{ select: typeof rowSelect }>

function toRow(row: RawRow): TaskRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedToMembershipId: row.assignedToMembershipId,
    assignee: row.assignedTo
      ? {
          membershipId: row.assignedTo.id,
          name: memberName(row.assignedTo.profile),
        }
      : null,
    companyId: row.companyId,
    companyName: row.company?.name ?? null,
    opportunityId: row.opportunityId,
    opportunityTitle: row.opportunity?.title ?? null,
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const STATUS_SET = new Set<TaskStatus>([
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
])
const PRIORITY_SET = new Set<TaskPriority>([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
])

export type TasksPageParams = {
  organizationId: string
  currentMembershipId: string
  scope?: TaskScope
  status?: string
  priority?: string
  assigneeMembershipId?: string
  q?: string
}

export type TasksPageData = {
  tasks: TaskRow[]
  members: MemberRef[]
}

function buildWhere(params: TasksPageParams): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {
    organizationId: params.organizationId,
    archivedAt: null,
  }
  if ((params.scope ?? "mine") === "mine") {
    where.assignedToMembershipId = params.currentMembershipId
  } else if (params.assigneeMembershipId) {
    where.assignedToMembershipId = params.assigneeMembershipId
  }
  if (params.status && STATUS_SET.has(params.status as TaskStatus)) {
    where.status = params.status as TaskStatus
  }
  if (params.priority && PRIORITY_SET.has(params.priority as TaskPriority)) {
    where.priority = params.priority as TaskPriority
  }
  const q = params.q?.trim()
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
      { opportunity: { title: { contains: q, mode: "insensitive" } } },
    ]
  }
  return where
}

export async function getTasksPageData(
  params: TasksPageParams
): Promise<TasksPageData> {
  const [rows, members] = await Promise.all([
    prisma.task.findMany({
      where: buildWhere(params),
      select: rowSelect,
      orderBy: [
        { status: "asc" },
        { dueAt: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      take: 500,
    }),
    listMembers(params.organizationId),
  ])
  return { tasks: rows.map(toRow), members }
}

/** Every non-archived task for the agenda / plan view (client buckets by day). */
export async function getAgendaTasks(
  params: TasksPageParams
): Promise<TasksPageData> {
  const where = buildWhere(params)
  where.status = where.status ?? { in: ["TODO", "IN_PROGRESS", "DONE"] }
  const [rows, members] = await Promise.all([
    prisma.task.findMany({
      where,
      select: rowSelect,
      orderBy: [
        { dueAt: { sort: "asc", nulls: "last" } },
        { priority: "desc" },
      ],
      take: 500,
    }),
    listMembers(params.organizationId),
  ])
  return { tasks: rows.map(toRow), members }
}

/** Open tasks for one opportunity's detail sidebar. */
export async function listOpportunityTasks(
  organizationId: string,
  opportunityId: string,
  take = 50
): Promise<TaskRow[]> {
  const rows = await prisma.task.findMany({
    where: { organizationId, opportunityId, archivedAt: null },
    select: rowSelect,
    orderBy: [
      { status: "asc" },
      { dueAt: { sort: "asc", nulls: "last" } },
    ],
    take,
  })
  return rows.map(toRow)
}

/** Tasks due on/before `days` from now, for the dashboard action list. */
export async function listUpcomingTasks(
  organizationId: string,
  take = 8
): Promise<TaskRow[]> {
  const rows = await prisma.task.findMany({
    where: {
      organizationId,
      archivedAt: null,
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    select: rowSelect,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take,
  })
  return rows.map(toRow)
}
