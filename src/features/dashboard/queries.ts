import "server-only"

import { prisma } from "@/lib/db/prisma"
import type { PipelineStageType } from "@/generated/prisma/enums"
import {
  listRecentActivities,
  type ActivityListItem,
} from "@/features/activities/queries"
import { listUpcomingTasks } from "@/features/tasks/queries"
import type { TaskRow } from "@/features/tasks/queries"

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

export type DashboardQuickRow = {
  id: string
  companyName: string
  title: string
  stageName: string
  stageType: PipelineStageType
  ownerName: string | null
  nextAction: string | null
  estimatedValue: number | null
  currency: string
  updatedAt: Date
}

export type DashboardData = {
  metrics: DashboardMetric[]
  currency: string
  stageSummary: DashboardStageSummary[]
  agenda: DashboardAgendaItem[]
  recentActivities: ActivityListItem[]
  quickPipeline: DashboardQuickRow[]
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

export async function getDashboardData(
  organizationId: string
): Promise<DashboardData> {
  const [
    stages,
    companyCount,
    openOpps,
    wonAgg,
    stageGroups,
    valueGroups,
    proposalActivityCount,
    upcomingTasks,
    nextActionOpps,
    recentActivities,
    quickRows,
  ] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, type: true, position: true },
      orderBy: { position: "asc" },
    }),
    prisma.company.count({ where: { organizationId, archivedAt: null } }),
    prisma.opportunity.findMany({
      where: {
        organizationId,
        archivedAt: null,
        stage: { type: "OPEN" },
      },
      select: { estimatedValue: true },
    }),
    prisma.opportunity.aggregate({
      where: { organizationId, stage: { type: "WON" } },
      _count: { _all: true },
      _sum: { estimatedValue: true },
    }),
    prisma.opportunity.groupBy({
      by: ["stageId"],
      where: { organizationId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.opportunity.groupBy({
      by: ["stageId"],
      where: { organizationId, archivedAt: null },
      _sum: { estimatedValue: true },
    }),
    prisma.activity.count({
      where: { organizationId, type: "PROPOSAL" },
    }),
    listUpcomingTasks(organizationId, 12),
    prisma.opportunity.findMany({
      where: {
        organizationId,
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
      take: 12,
    }),
    listRecentActivities(organizationId, 6),
    prisma.opportunity.findMany({
      where: {
        organizationId,
        archivedAt: null,
        stage: { type: "OPEN" },
      },
      select: {
        id: true,
        title: true,
        nextAction: true,
        estimatedValue: true,
        currency: true,
        updatedAt: true,
        company: { select: { name: true } },
        stage: { select: { name: true, type: true } },
        owner: {
          select: { profile: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ])

  const currency = quickRows[0]?.currency ?? "TRY"

  const potentialValue = openOpps.reduce(
    (sum, o) => sum + (o.estimatedValue ?? 0),
    0
  )
  const wonValue = wonAgg._sum.estimatedValue ?? 0
  const wonCount = wonAgg._count._all

  const meetingStage = stages.find((s) =>
    s.name.toLocaleLowerCase("tr").includes("görüşme")
  )
  const meetingCount = meetingStage
    ? (stageGroups.find((g) => g.stageId === meetingStage.id)?._count._all ?? 0)
    : 0

  const countByStage = new Map(
    stageGroups.map((g) => [g.stageId, g._count._all])
  )
  const valueByStage = new Map(
    valueGroups.map((g) => [g.stageId, g._sum.estimatedValue ?? 0])
  )

  const stageSummary: DashboardStageSummary[] = stages.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    count: countByStage.get(s.id) ?? 0,
    value: valueByStage.get(s.id) ?? 0,
  }))

  const metrics: DashboardMetric[] = [
    {
      key: "companies",
      label: "Toplam Firma",
      value: nf.format(companyCount),
      hint: "Arşivlenmemiş firmalar",
    },
    {
      key: "active-opportunities",
      label: "Aktif Fırsat",
      value: nf.format(openOpps.length),
      hint: `${stageSummary.filter((s) => s.type === "OPEN" && s.count > 0).length} aşamada ilerliyor`,
    },
    {
      key: "planned-meetings",
      label: "Planlanan Görüşme",
      value: nf.format(meetingCount),
      hint: "Görüşme aşamasındaki fırsatlar",
    },
    {
      key: "sent-proposals",
      label: "Gönderilen Teklif",
      value: nf.format(proposalActivityCount),
      hint: "Teklif aktiviteleri",
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
      hint: "Açık fırsatların toplamı",
    },
  ]

  const agenda: DashboardAgendaItem[] = [
    ...upcomingTasks.map(
      (t: TaskRow): DashboardAgendaItem => ({
        id: `task:${t.id}`,
        kind: "task",
        title: t.title,
        context: t.opportunityTitle ?? t.companyName ?? null,
        href: t.opportunityId
          ? `/opportunities/${t.opportunityId}`
          : "/tasks",
        dueAt: t.dueAt,
        priority: t.priority,
        done: t.status === "DONE",
      })
    ),
    ...nextActionOpps.map(
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

  const quickPipeline: DashboardQuickRow[] = quickRows.map((r) => ({
    id: r.id,
    companyName: r.company.name,
    title: r.title,
    stageName: r.stage.name,
    stageType: r.stage.type,
    ownerName: r.owner
      ? r.owner.profile.fullName?.trim() || r.owner.profile.email
      : null,
    nextAction: r.nextAction,
    estimatedValue: r.estimatedValue,
    currency: r.currency,
    updatedAt: r.updatedAt,
  }))

  return {
    metrics,
    currency,
    stageSummary,
    agenda,
    recentActivities,
    quickPipeline,
  }
}
