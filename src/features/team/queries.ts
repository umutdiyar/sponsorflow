import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { OrganizationRole } from "@/generated/prisma/enums"
import { ORGANIZATION_ROLE_LABELS } from "@/lib/auth/permissions"

export type TeamMemberRow = {
  membershipId: string
  name: string
  email: string
  role: OrganizationRole
  roleLabel: string
  joinedAt: Date
  isCurrentUser: boolean
  stats: { openOpportunities: number; openTasks: number }
}

const ROLE_ORDER: Record<OrganizationRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  SPONSORSHIP_LEAD: 2,
  MEMBER: 3,
  VIEWER: 4,
}

export async function getTeamMembers(
  organizationId: string,
  currentMembershipId: string
): Promise<TeamMemberRow[]> {
  const [members, oppCounts, taskCounts] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        profile: { select: { fullName: true, email: true } },
      },
    }),
    prisma.opportunity.groupBy({
      by: ["ownerMembershipId"],
      where: { organizationId, archivedAt: null },
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

  const oppMap = new Map(
    oppCounts.map((c) => [c.ownerMembershipId, c._count._all])
  )
  const taskMap = new Map(
    taskCounts.map((c) => [c.assignedToMembershipId, c._count._all])
  )

  return members
    .map((m) => ({
      membershipId: m.id,
      name: m.profile.fullName?.trim() || m.profile.email,
      email: m.profile.email,
      role: m.role,
      roleLabel: ORGANIZATION_ROLE_LABELS[m.role],
      joinedAt: m.createdAt,
      isCurrentUser: m.id === currentMembershipId,
      stats: {
        openOpportunities: oppMap.get(m.id) ?? 0,
        openTasks: taskMap.get(m.id) ?? 0,
      },
    }))
    .sort((a, b) => {
      const r = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      return r !== 0 ? r : a.joinedAt.getTime() - b.joinedAt.getTime()
    })
}
