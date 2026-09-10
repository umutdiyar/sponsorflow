import "server-only"

import { prisma } from "@/lib/db/prisma"
import { addDaysToKey, istanbulDayKey, parseIstanbulDate } from "@/lib/format"
import { listMembers } from "@/lib/org/reference"
import {
  listRecentActivities,
  type ActivityListItem,
} from "@/features/activities/queries"

export type DashboardMetric = {
  key: string
  label: string
  value: number
  hint: string
}

export type AgendaItem = {
  id: string
  kind: "task" | "follow-up"
  title: string
  company: string | null
  process: string | null
  ownerName: string | null
  href: string
  dueAt: Date | null
  allDay: boolean
  overdue: boolean
}

export type TeamStatusRow = {
  membershipId: string
  name: string
  companies: number
  followUps: number
  isCurrentUser: boolean
}

export type DashboardData = {
  metrics: DashboardMetric[]
  agenda: AgendaItem[]
  team: TeamStatusRow[]
  unassignedCompanies: number
  recentActivities: ActivityListItem[]
  /** Whether the agenda covers the whole team (lead) or just the viewer. */
  agendaIsTeam: boolean
}

function memberName(p: { fullName: string | null; email: string }) {
  return p.fullName?.trim() || p.email
}

/** A DateTime stored at UTC-midnight is a date-only ("all day") value here. */
function isAllDay(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  )
}

export async function getDashboardData(args: {
  organizationId: string
  membershipId: string
  isLead: boolean
}): Promise<DashboardData> {
  const { organizationId, membershipId, isLead } = args
  const todayKey = istanbulDayKey(new Date())
  const tomorrowStart = parseIstanbulDate(addDaysToKey(todayKey, 1))!

  const scopeToMe = isLead ? {} : { assignedToMembershipId: membershipId }
  const oppScopeToMe = isLead ? {} : { ownerMembershipId: membershipId }

  const [
    companyGroups,
    openOppGroups,
    followupGroups,
    overdueTaskGroups,
    agendaTasks,
    agendaFollowups,
    members,
    recentActivities,
  ] = await Promise.all([
    prisma.company.groupBy({
      by: ["ownerMembershipId"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ["ownerMembershipId"],
      where: { organizationId, archivedAt: null, stage: { type: "OPEN" } },
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
    prisma.task.findMany({
      where: {
        organizationId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { lt: tomorrowStart },
        ...scopeToMe,
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        opportunityId: true,
        company: { select: { name: true } },
        opportunity: { select: { title: true } },
        assignedTo: {
          select: { profile: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: [{ dueAt: "asc" }],
      take: 50,
    }),
    prisma.opportunity.findMany({
      where: {
        organizationId,
        archivedAt: null,
        nextActionAt: { lt: tomorrowStart },
        ...oppScopeToMe,
      },
      select: {
        id: true,
        title: true,
        nextAction: true,
        nextActionAt: true,
        company: { select: { name: true } },
        owner: {
          select: { profile: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: [{ nextActionAt: "asc" }],
      take: 50,
    }),
    listMembers(organizationId),
    listRecentActivities(organizationId, 5),
  ])

  // Company ownership.
  let totalCompanies = 0
  let unassignedCompanies = 0
  const companiesByOwner = new Map<string, number>()
  for (const g of companyGroups) {
    totalCompanies += g._count._all
    if (g.ownerMembershipId) {
      companiesByOwner.set(g.ownerMembershipId, g._count._all)
    } else {
      unassignedCompanies = g._count._all
    }
  }

  const activeProcesses = openOppGroups.reduce(
    (sum, g) => sum + g._count._all,
    0
  )
  const followUpTotal = followupGroups.reduce(
    (sum, g) => sum + g._count._all,
    0
  )

  const followupByOwner = new Map<string, number>()
  for (const g of followupGroups) {
    if (g.ownerMembershipId) {
      followupByOwner.set(g.ownerMembershipId, g._count._all)
    }
  }
  const overdueTaskByOwner = new Map(
    overdueTaskGroups.map((g) => [g.assignedToMembershipId, g._count._all])
  )

  // Agenda — today (or earlier) tasks + opportunity follow-ups.
  const agenda: AgendaItem[] = [
    ...agendaTasks.map((t): AgendaItem => ({
      id: `task:${t.id}`,
      kind: "task",
      title: t.title,
      company: t.company?.name ?? null,
      process: t.opportunity?.title ?? null,
      ownerName: memberName(t.assignedTo.profile),
      href: t.opportunityId
        ? `/opportunities/${t.opportunityId}`
        : "/tasks",
      dueAt: t.dueAt,
      allDay: t.dueAt ? isAllDay(t.dueAt) : true,
      overdue: t.dueAt ? istanbulDayKey(t.dueAt) < todayKey : false,
    })),
    ...agendaFollowups.map((o): AgendaItem => ({
      id: `follow:${o.id}`,
      kind: "follow-up",
      title: o.nextAction?.trim() || "Takip",
      company: o.company.name,
      process: o.title,
      ownerName: o.owner ? memberName(o.owner.profile) : null,
      href: `/opportunities/${o.id}`,
      dueAt: o.nextActionAt,
      allDay: o.nextActionAt ? isAllDay(o.nextActionAt) : true,
      overdue: o.nextActionAt
        ? istanbulDayKey(o.nextActionAt) < todayKey
        : false,
    })),
  ].sort((a, b) => {
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return a.dueAt.getTime() - b.dueAt.getTime()
  })

  // Team status — everyone's companies + follow-up load.
  const team: TeamStatusRow[] = members
    .map((m) => ({
      membershipId: m.membershipId,
      name: m.name,
      companies: companiesByOwner.get(m.membershipId) ?? 0,
      followUps:
        (followupByOwner.get(m.membershipId) ?? 0) +
        (overdueTaskByOwner.get(m.membershipId) ?? 0),
      isCurrentUser: m.membershipId === membershipId,
    }))
    .sort((a, b) => b.companies - a.companies || b.followUps - a.followUps)

  const metrics: DashboardMetric[] = [
    {
      key: "companies",
      label: "Firma",
      value: totalCompanies,
      hint: "toplam firma",
    },
    {
      key: "unassigned",
      label: "Atanmamış",
      value: unassignedCompanies,
      hint: "sorumlusu yok",
    },
    {
      key: "follow-ups",
      label: "Takip Bekleyen",
      value: followUpTotal,
      hint: "gecikmiş / bugünkü takip",
    },
    {
      key: "active-processes",
      label: "Aktif Sponsor Süreci",
      value: activeProcesses,
      hint: "açık pipeline süreci",
    },
  ]

  return {
    metrics,
    agenda,
    team,
    unassignedCompanies,
    recentActivities,
    agendaIsTeam: isLead,
  }
}
