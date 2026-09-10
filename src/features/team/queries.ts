import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { OrganizationRole } from "@/generated/prisma/enums"
import { ORGANIZATION_ROLE_LABELS } from "@/lib/auth/permissions"
import { addDaysToKey, istanbulDayKey, parseIstanbulDate } from "@/lib/format"

export type TeamMemberRow = {
  membershipId: string
  name: string
  email: string
  role: OrganizationRole
  roleLabel: string
  joinedAt: Date
  isCurrentUser: boolean
  stats: {
    companies: number
    followUps: number
    plannedTasks: number
  }
}

const ROLE_ORDER: Record<OrganizationRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  SPONSORSHIP_LEAD: 2,
  MEMBER: 3,
  VIEWER: 4,
}

function memberName(p: { fullName: string | null; email: string }) {
  return p.fullName?.trim() || p.email
}

export async function getTeamMembers(
  organizationId: string,
  currentMembershipId: string
): Promise<TeamMemberRow[]> {
  const tomorrowStart = parseIstanbulDate(
    addDaysToKey(istanbulDayKey(new Date()), 1)
  )!

  const [members, companyCounts, followupOpps, overdueTasks, plannedTasks] =
    await Promise.all([
      prisma.organizationMembership.findMany({
        where: { organizationId, deactivatedAt: null },
        select: {
          id: true,
          role: true,
          createdAt: true,
          profile: { select: { fullName: true, email: true } },
        },
      }),
      prisma.company.groupBy({
        by: ["ownerMembershipId"],
        where: {
          organizationId,
          archivedAt: null,
          ownerMembershipId: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.opportunity.groupBy({
        by: ["ownerMembershipId"],
        where: {
          organizationId,
          archivedAt: null,
          nextActionAt: { lt: tomorrowStart },
        },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["assignedToMembershipId"],
        where: {
          organizationId,
          archivedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueAt: { lt: tomorrowStart },
        },
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ["assignedToMembershipId"],
        where: {
          organizationId,
          archivedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        _count: { _all: true },
      }),
    ])

  const companyMap = new Map(
    companyCounts.map((c) => [c.ownerMembershipId, c._count._all])
  )
  const followupMap = new Map(
    followupOpps.map((c) => [c.ownerMembershipId, c._count._all])
  )
  const overdueTaskMap = new Map(
    overdueTasks.map((c) => [c.assignedToMembershipId, c._count._all])
  )
  const plannedTaskMap = new Map(
    plannedTasks.map((c) => [c.assignedToMembershipId, c._count._all])
  )

  return members
    .map((m) => ({
      membershipId: m.id,
      name: memberName(m.profile),
      email: m.profile.email,
      role: m.role,
      roleLabel: ORGANIZATION_ROLE_LABELS[m.role],
      joinedAt: m.createdAt,
      isCurrentUser: m.id === currentMembershipId,
      stats: {
        companies: companyMap.get(m.id) ?? 0,
        followUps:
          (followupMap.get(m.id) ?? 0) + (overdueTaskMap.get(m.id) ?? 0),
        plannedTasks: plannedTaskMap.get(m.id) ?? 0,
      },
    }))
    .sort((a, b) => {
      const r = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      return r !== 0 ? r : a.joinedAt.getTime() - b.joinedAt.getTime()
    })
}

export async function getTeamPageData(
  organizationId: string,
  currentMembershipId: string
): Promise<{ members: TeamMemberRow[] }> {
  const members = await getTeamMembers(organizationId, currentMembershipId)
  return { members }
}
