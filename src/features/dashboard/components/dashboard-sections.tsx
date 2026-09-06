import Link from "next/link"

import { cn } from "@/lib/utils"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { EmptyState } from "@/components/common/empty-state"
import {
  BuildingIcon,
  CheckSquareIcon,
  ClockAlertIcon,
  TargetIcon,
} from "lucide-react"
import {
  describeDue,
  formatMoneyCompact,
  formatTimeAgo,
  istanbulDayKey,
  timelineGroupLabel,
} from "@/lib/format"
import { ActivityIcon } from "@/features/activities/components/activity-icon"
import {
  ACTIVITY_CHANNEL_LABELS,
  ACTIVITY_KIND_LABELS,
} from "@/features/activities/schema"
import type { ActivityListItem } from "@/features/activities/queries"
import type {
  DashboardAgendaItem,
  DashboardStageSummary,
  WorkloadRow,
} from "@/features/dashboard/queries"

const DUE_TONE: Record<string, string> = {
  overdue: "text-destructive",
  today: "text-warning-foreground",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
}

/* ------------------------------------------------------------------ */

export function MyWorkStrip({
  work,
}: {
  work: {
    companies: number
    openOpportunities: number
    dueToday: number
    overdue: number
  }
}) {
  const cells = [
    { label: "Firmam", value: work.companies, href: "/companies?filter=mine" },
    {
      label: "Açık Fırsatım",
      value: work.openOpportunities,
      href: "/opportunities?owner=me",
    },
    { label: "Bugün", value: work.dueToday, href: "/tasks" },
    { label: "Geciken", value: work.overdue, href: "/tasks?quick=overdue" },
  ]
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4">
      {cells.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="bg-card hover:bg-muted/40 flex flex-col gap-0.5 px-3.5 py-3"
        >
          <span
            className={cn(
              "font-heading text-lg leading-tight font-semibold tabular-nums",
              c.label === "Geciken" && c.value > 0 && "text-destructive"
            )}
          >
            {c.value}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {c.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function TodayPanel({
  items,
  overdueCount,
}: {
  items: DashboardAgendaItem[]
  overdueCount: number
}) {
  const today = istanbulDayKey(new Date())
  const list = items
    .filter((i) => !i.done && (!i.dueAt || istanbulDayKey(i.dueAt) <= today))
    .slice(0, 10)

  return (
    <Panel>
      <PanelHeader
        title="Bugün Yapılacaklar"
        description={
          overdueCount > 0
            ? `${overdueCount} geciken · bugüne kadar planlanan işler`
            : "Bugüne kadar planlanan görev ve aksiyonlar"
        }
        action={{ label: "Tüm görevler", href: "/tasks" }}
      />
      {list.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={CheckSquareIcon}
            title="Bugün için bekleyen işin yok"
            description="Sana atanan bir görev ya da fırsat aksiyonu olduğunda burada görünecek."
          />
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {list.map((item) => {
            const due = describeDue(item.dueAt)
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      item.kind === "next-action"
                        ? "bg-brand"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{item.title}</span>
                    {item.context ? (
                      <span className="text-muted-foreground truncate text-xs">
                        {item.context}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-xs font-medium",
                      DUE_TONE[due.tone]
                    )}
                  >
                    {due.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function UpcomingStrip({ items }: { items: DashboardAgendaItem[] }) {
  const today = istanbulDayKey(new Date())
  const dated = items
    .filter(
      (i) => i.dueAt && !i.done && istanbulDayKey(i.dueAt) > today
    )
    .slice(0, 8)

  return (
    <Panel>
      <PanelHeader title="Yaklaşanlar" description="Önümüzdeki günlerin planı" />
      <PanelContent className="flex flex-col gap-1">
        {dated.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tarihli bir işin yok.</p>
        ) : (
          dated.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <span className="text-muted-foreground w-16 shrink-0 text-xs font-medium tabular-nums">
                {shortDay(item.dueAt!)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {item.title}
              </span>
            </Link>
          ))
        )}
      </PanelContent>
    </Panel>
  )
}

function shortDay(date: Date) {
  const label = timelineGroupLabel(date)
  if (label === "Bugün" || label === "Yarın" || label === "Dün") return label
  return label.slice(0, 6)
}

/* ------------------------------------------------------------------ */

export function StageProgress({
  stages,
  currency,
}: {
  stages: DashboardStageSummary[]
  currency: string
}) {
  const max = Math.max(...stages.map((s) => s.count), 1)
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <Panel>
      <PanelHeader
        title="Pipeline Özeti"
        description={`${total} fırsat · ${stages.length} aşama`}
        action={{ label: "Pipeline", href: "/pipeline" }}
      />
      <PanelContent className="flex flex-col gap-2.5">
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz fırsat yok.</p>
        ) : (
          stages.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-32 shrink-0 truncate text-xs">
                {s.name}
              </span>
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full",
                    s.type === "WON"
                      ? "bg-success"
                      : s.type === "LOST"
                        ? "bg-destructive/60"
                        : "bg-foreground/70"
                  )}
                  style={{ width: `${(s.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums">
                {s.count}
              </span>
              <span className="text-muted-foreground w-14 shrink-0 text-right text-[0.6875rem] tabular-nums">
                {s.value > 0 ? formatMoneyCompact(s.value, currency) : ""}
              </span>
            </div>
          ))
        )}
      </PanelContent>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function TeamWorkloadPanel({
  rows,
  unassigned,
}: {
  rows: WorkloadRow[]
  unassigned: number
}) {
  return (
    <Panel>
      <PanelHeader
        title="Ekip İş Yükü"
        description="Firma ve iş dağılımı"
        action={{ label: "Ekip", href: "/team" }}
      />
      <ul className="divide-border divide-y">
        {rows.map((r) => (
          <li
            key={r.membershipId}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <span className="flex items-center gap-1.5 truncate font-medium">
              {r.name}
              {r.isCurrentUser ? (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[0.625rem]">
                  Sen
                </span>
              ) : null}
            </span>
            <span className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1">
                <BuildingIcon className="size-3.5" />
                {r.companies}
              </span>
              <span className="inline-flex items-center gap-1">
                <TargetIcon className="size-3.5" />
                {r.openOpportunities}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  r.overdue > 0 && "text-destructive"
                )}
              >
                <ClockAlertIcon className="size-3.5" />
                {r.overdue}/{r.openTasks}
              </span>
            </span>
          </li>
        ))}
        {unassigned > 0 ? (
          <li>
            <Link
              href="/companies?owner=unassigned"
              className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="font-medium">Atanmamış</span>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
                <BuildingIcon className="size-3.5" />
                {unassigned} firma
              </span>
            </Link>
          </li>
        ) : null}
      </ul>
      <PanelContent className="text-muted-foreground border-t pt-2 text-[0.6875rem]">
        Sütunlar: firma · açık fırsat · geciken/açık görev
      </PanelContent>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function RecentActivityPanel({
  activities,
}: {
  activities: ActivityListItem[]
}) {
  return (
    <Panel>
      <PanelHeader
        title="Son Aktiviteler"
        description="Ekibin son hareketleri"
        action={{ label: "Tümü", href: "/activities" }}
      />
      {activities.length === 0 ? (
        <PanelContent>
          <p className="text-muted-foreground text-sm">
            Henüz aktivite kaydı yok.
          </p>
        </PanelContent>
      ) : (
        <ul className="divide-border divide-y">
          {activities.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <ActivityIcon channel={a.channel} direction={a.direction} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm leading-snug">
                  {a.title?.trim() ||
                    (a.kind === "STAGE_CHANGE"
                      ? ACTIVITY_KIND_LABELS[a.kind]
                      : `${ACTIVITY_CHANNEL_LABELS[a.channel]} · ${ACTIVITY_KIND_LABELS[a.kind]}`)}
                  {a.description ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {a.description}
                    </span>
                  ) : null}
                </p>
                <span className="text-muted-foreground text-xs">
                  {a.author} · {a.companyName} · {formatTimeAgo(a.occurredAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
