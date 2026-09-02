import Link from "next/link"

import { cn } from "@/lib/utils"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { EmptyState } from "@/components/common/empty-state"
import {
  CheckSquareIcon,
  GitBranchIcon,
} from "lucide-react"
import {
  describeDue,
  formatMoney,
  formatMoneyCompact,
  formatTimeAgo,
  istanbulDayKey,
  timelineGroupLabel,
} from "@/lib/format"
import { ActivityIcon } from "@/features/activities/components/activity-icon"
import { ACTIVITY_TYPE_LABELS } from "@/features/activities/schema"
import { StagePill } from "@/features/opportunities/components/stage-pill"
import type { ActivityListItem } from "@/features/activities/queries"
import type {
  DashboardAgendaItem,
  DashboardQuickRow,
  DashboardStageSummary,
} from "@/features/dashboard/queries"

const DUE_TONE: Record<string, string> = {
  overdue: "text-destructive",
  today: "text-warning-foreground",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
}

/* ------------------------------------------------------------------ */

export function TodayPanel({ items }: { items: DashboardAgendaItem[] }) {
  const today = istanbulDayKey(new Date())
  const list = items
    .filter(
      (i) =>
        !i.done &&
        (!i.dueAt || istanbulDayKey(i.dueAt) <= today)
    )
    .slice(0, 8)

  return (
    <Panel>
      <PanelHeader
        title="Bugün Yapılacaklar"
        description="Bugüne kadar planlanmış görev ve aksiyonlar"
        action={{ label: "Tüm görevler", href: "/tasks" }}
      />
      {list.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={CheckSquareIcon}
            title="Bugün için bekleyen aksiyon yok"
            description="Yeni bir görev ya da sonraki aksiyon eklediğinde burada görünecek."
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
  const dated = items.filter((i) => i.dueAt && !i.done).slice(0, 8)

  return (
    <Panel>
      <PanelHeader
        title="Yaklaşanlar"
        description="Önümüzdeki günlerin planı"
      />
      <PanelContent className="flex flex-col gap-2">
        {dated.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tarihli bir aksiyon yok.
          </p>
        ) : (
          dated.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-1.5"
            >
              <span className="text-muted-foreground w-16 shrink-0 text-xs font-medium tabular-nums uppercase">
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
              <ActivityIcon type={a.type} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm leading-snug">
                  {a.title?.trim() || ACTIVITY_TYPE_LABELS[a.type]}
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

/* ------------------------------------------------------------------ */

export function QuickPipelinePanel({
  rows,
}: {
  rows: DashboardQuickRow[]
}) {
  return (
    <Panel>
      <PanelHeader
        title="Hızlı Pipeline"
        description="Öne çıkan açık fırsatlar"
        action={{ label: "Tüm fırsatlar", href: "/opportunities" }}
      />
      {rows.length === 0 ? (
        <PanelContent>
          <EmptyState
            icon={GitBranchIcon}
            title="Açık fırsat yok"
            description="Bir fırsat oluşturduğunda burada görünecek."
          />
        </PanelContent>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-2 font-medium">Firma / Fırsat</th>
                <th className="px-4 py-2 font-medium">Aşama</th>
                <th className="px-4 py-2 font-medium">Sorumlu</th>
                <th className="w-full px-4 py-2 font-medium">Sonraki Aksiyon</th>
                <th className="px-4 py-2 text-right font-medium">
                  Tahmini Değer
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/opportunities/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {r.companyName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StagePill name={r.stageName} type={r.stageType} />
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {r.ownerName ?? "—"}
                  </td>
                  <td className="text-muted-foreground w-full px-4 py-2.5">
                    {r.nextAction ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {r.estimatedValue != null
                      ? formatMoney(r.estimatedValue, r.currency)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
