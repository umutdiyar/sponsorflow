import "server-only"

import { prisma } from "@/lib/db/prisma"
import type {
  InvitationStatus,
  OrganizationRole,
} from "@/generated/prisma/enums"
import { ORGANIZATION_ROLE_LABELS } from "@/lib/auth/permissions"

export type TeamMemberRow = {
  membershipId: string
  name: string
  email: string
  role: OrganizationRole
  roleLabel: string
  joinedAt: Date
  isCurrentUser: boolean
  stats: {
    openCompanies: number
    openOpportunities: number
    openTasks: number
  }
}

export type PendingInvitationRow = {
  id: string
  email: string
  fullName: string | null
  role: OrganizationRole
  roleLabel: string
  status: InvitationStatus
  invitedByName: string
  createdAt: Date
  expiresAt: Date | null
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
  const [members, companyCounts, oppCounts, taskCounts] = await Promise.all([
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
      where: { organizationId, archivedAt: null, ownerMembershipId: { not: null } },
      _count: { _all: true },
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

  const companyMap = new Map(
    companyCounts.map((c) => [c.ownerMembershipId, c._count._all])
  )
  const oppMap = new Map(
    oppCounts.map((c) => [c.ownerMembershipId, c._count._all])
  )
  const taskMap = new Map(
    taskCounts.map((c) => [c.assignedToMembershipId, c._count._all])
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
        openCompanies: companyMap.get(m.id) ?? 0,
        openOpportunities: oppMap.get(m.id) ?? 0,
        openTasks: taskMap.get(m.id) ?? 0,
      },
    }))
    .sort((a, b) => {
      const r = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      return r !== 0 ? r : a.joinedAt.getTime() - b.joinedAt.getTime()
    })
}

export async function getPendingInvitations(
  organizationId: string
): Promise<PendingInvitationRow[]> {
  const rows = await prisma.organizationInvitation.findMany({
    where: { organizationId, status: "PENDING" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      invitedBy: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    role: r.role,
    roleLabel: ORGANIZATION_ROLE_LABELS[r.role],
    status: r.status,
    invitedByName: memberName(r.invitedBy.profile),
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  }))
}

export async function getTeamPageData(
  organizationId: string,
  currentMembershipId: string
): Promise<{
  members: TeamMemberRow[]
  invitations: PendingInvitationRow[]
}> {
  const [members, invitations] = await Promise.all([
    getTeamMembers(organizationId, currentMembershipId),
    getPendingInvitations(organizationId),
  ])
  return { members, invitations }
}
