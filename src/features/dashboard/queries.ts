import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { PipelineStageType } from "@/generated/prisma/enums"
import { istanbulDayKey, parseIstanbulDate } from "@/lib/format"
import {
  listRecentActivities,
  type ActivityListItem,
} from "@/features/activities/queries"

export type DashboardMetric = {
  key: string
  label: string
  value: string
  hint: string
}

export type DashboardStageSummary = {
  id: string
  name: string
  type: PipelineStageType
  count: number
  value: number
}

export type DashboardAgendaItem = {
  id: string
  kind: "task" | "next-action"
  title: string
  context: string | null
  href: string
  dueAt: Date | null
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null
  done: boolean
}

export type WorkloadRow = {
  membershipId: string
  name: string
  companies: number
  openOpportunities: number
  openTasks: number
  overdue: number
  isCurrentUser: boolean
}

export type DashboardData = {
  metrics: DashboardMetric[]
  currency: string
  stageSummary: DashboardStageSummary[]
  agenda: DashboardAgendaItem[]
  overdueCount: number
  recentActivities: ActivityListItem[]
  workload: WorkloadRow[] | null
  unassignedCompanies: number
  myWork: {
    companies: number
    openOpportunities: number
    dueToday: number
    overdue: number
  }
}

const nf = new Intl.NumberFormat("tr-TR")

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${nf.format(amount)} ${currency}`
  }
}

function memberName(p: { fullName: string | null; email: string }) {
  return p.fullName?.trim() || p.email
}

export async function getDashboardData(args: {
  organizationId: string
  membershipId: string
  isLead: boolean
}): Promise<DashboardData> {
  const { organizationId, membershipId, isLead } = args
  const todayStart = parseIstanbulDate(istanbulDayKey(new Date()))!

  const [
    stages,
    companyOwnerGroups,
    stageGroups,
    openOwnerGroups,
    wonAgg,
    proposalActivityCount,
    members,
    myTasks,
    myNextActionOpps,
    overdueTaskGroups,
    recentActivities,
    openTaskGroups,
  ] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, type: true, position: true },
      orderBy: { position: "asc" },
    }),
    prisma.company.groupBy({
      by: ["ownerMembershipId"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ["stageId"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.opportunity.groupBy({
      by: ["ownerMembershipId"],
      where: { organizationId, archivedAt: null, stage: { type: "OPEN" } },
      _count: { _all: true },
    }),
    prisma.opportunity.aggregate({
      where: { organizationId, stage: { type: "WON" } },
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.activity.count({ where: { organizationId, kind: "PROPOSAL" } }),
    isLead
      ? prisma.organizationMembership.findMany({
          where: { organizationId, deactivatedAt: null },
          select: {
            id: true,
            createdAt: true,
            profile: { select: { fullName: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: {
        organizationId,
        assignedToMembershipId: membershipId,
        archivedAt: null,
        status: { in: ["TODO", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        opportunityId: true,
        company: { select: { name: true } },
        opportunity: { select: { title: true } },
      },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
      take: 100,
    }),
    prisma.opportunity.findMany({
      where: {
        organizationId,
        ownerMembershipId: membershipId,
        archivedAt: null,
        nextActionAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        nextAction: true,
        nextActionAt: true,
        company: { select: { name: true } },
      },
      orderBy: { nextActionAt: "asc" },
      take: 100,
    }),
    isLead
      ? prisma.task.groupBy({
          by: ["assignedToMembershipId"],
          where: {
            organizationId,
            archivedAt: null,
            status: { in: ["TODO", "IN_PROGRESS"] },
            dueAt: { lt: todayStart },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    listRecentActivities(organizationId, 6),
    isLead
      ? prisma.task.groupBy({
          by: ["assignedToMembershipId"],
          where: {
            organizationId,
            archivedAt: null,
            status: { in: ["TODO", "IN_PROGRESS"] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])

  const currency = "TRY"

  // Company ownership.
  let totalCompanies = 0
  let unassignedCompanies = 0
  const companiesByOwner = new Map<string, number>()
  for (const g of companyOwnerGroups) {
    totalCompanies += g._count._all
    if (g.ownerMembershipId) companiesByOwner.set(g.ownerMembershipId, g._count._all)
    else unassignedCompanies = g._count._all
  }

  // Pipeline stage summary + derived counts.
  const countByStage = new Map(stageGroups.map((g) => [g.stageId, g._count._all]))
  const valueByStage = new Map(
    stageGroups.map((g) => [g.stageId, g._sum.estimatedValue ?? 0])
  )
  const stageSummary: DashboardStageSummary[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    count: countByStage.get(s.id) ?? 0,
    value: valueByStage.get(s.id) ?? 0,
  }))
  const activeOpps = stageSummary
    .filter((s) => s.type === "OPEN")
    .reduce((sum, s) => sum + s.count, 0)
  const potentialValue = stageSummary
    .filter((s) => s.type === "OPEN")
    .reduce((sum, s) => sum + s.value, 0)

  const meetingStage = stages.find((s) =>
    s.name.toLocaleLowerCase("tr").includes("görüşme")
  )
  const meetingCount = meetingStage
    ? (countByStage.get(meetingStage.id) ?? 0)
    : 0

  const wonValue = wonAgg._sum.estimatedValue ?? 0
  const wonCount = wonAgg._count._all

  const openOppByOwner = new Map(
    openOwnerGroups.map((g) => [g.ownerMembershipId, g._count._all])
  )
  const overdueByOwner = new Map(
    overdueTaskGroups.map((g) => [g.assignedToMembershipId, g._count._all])
  )

  // Agenda = my tasks + my opportunity next actions.
  const agenda: DashboardAgendaItem[] = [
    ...myTasks.map(
      (t): DashboardAgendaItem => ({
        id: `task:${t.id}`,
        kind: "task",
        title: t.title,
        context: t.opportunity?.title ?? t.company?.name ?? null,
        href: t.opportunityId ? `/opportunities/${t.opportunityId}` : "/tasks",
        dueAt: t.dueAt,
        priority: t.priority,
        done: false,
      })
    ),
    ...myNextActionOpps.map(
      (o): DashboardAgendaItem => ({
        id: `next:${o.id}`,
        kind: "next-action",
        title: o.nextAction?.trim() || "Sonraki aksiyon",
        context: `${o.company.name} · ${o.title}`,
        href: `/opportunities/${o.id}`,
        dueAt: o.nextActionAt,
        priority: null,
        done: false,
      })
    ),
  ].sort((a, b) => {
    if (!a.dueAt) return 1
    if (!b.dueAt) return -1
    return a.dueAt.getTime() - b.dueAt.getTime()
  })

  const todayKey = istanbulDayKey(new Date())
  const overdueCount = agenda.filter(
    (i) => i.dueAt && istanbulDayKey(i.dueAt) < todayKey
  ).length

  const myWork = {
    companies: companiesByOwner.get(membershipId) ?? 0,
    openOpportunities: openOppByOwner.get(membershipId) ?? 0,
    dueToday: agenda.filter(
      (i) => i.dueAt && istanbulDayKey(i.dueAt) === todayKey
    ).length,
    overdue: overdueCount,
  }

  // Team workload (lead only).
  const openTaskByOwner = new Map(
    openTaskGroups.map((g) => [g.assignedToMembershipId, g._count._all])
  )
  const workload: WorkloadRow[] | null = isLead
    ? members.map((m) => ({
        membershipId: m.id,
        name: memberName(m.profile),
        companies: companiesByOwner.get(m.id) ?? 0,
        openOpportunities: openOppByOwner.get(m.id) ?? 0,
        openTasks: openTaskByOwner.get(m.id) ?? 0,
        overdue: overdueByOwner.get(m.id) ?? 0,
        isCurrentUser: m.id === membershipId,
      }))
    : null

  const metrics: DashboardMetric[] = [
    {
      key: "companies",
      label: "Firma",
      value: nf.format(totalCompanies),
      hint: `${unassignedCompanies} atanmamış`,
    },
    {
      key: "active-opportunities",
      label: "Aktif Fırsat",
      value: nf.format(activeOpps),
      hint: `${stageSummary.filter((s) => s.type === "OPEN" && s.count > 0).length} aşamada`,
    },
    {
      key: "planned-meetings",
      label: "Görüşme",
      value: nf.format(meetingCount),
      hint: "Görüşme aşamasında",
    },
    {
      key: "sent-proposals",
      label: "Gönderilen Teklif",
      value: nf.format(proposalActivityCount),
      hint: "Teklif kaydı",
    },
    {
      key: "won-sponsors",
      label: "Kazanılan Sponsor",
      value: nf.format(wonCount),
      hint: wonValue > 0 ? money(wonValue, currency) : "Bu dönem",
    },
    {
      key: "potential-value",
      label: "Potansiyel Değer",
      value: money(potentialValue, currency),
      hint: "Açık fırsatlar",
    },
  ]

  return {
    metrics,
    currency,
    stageSummary,
    agenda,
    overdueCount,
    recentActivities,
    workload,
    unassignedCompanies,
    myWork,
  }
}
