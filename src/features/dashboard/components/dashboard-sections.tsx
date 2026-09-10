import Link from "next/link"
import {
  Building2Icon,
  CircleDotIcon,
  ClockAlertIcon,
  TargetIcon,
  UserRoundIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { EmptyState } from "@/components/common/empty-state"
import { formatTime, formatTimeAgo } from "@/lib/format"
import { ActivityIcon } from "@/features/activities/components/activity-icon"
import {
  ACTIVITY_CHANNEL_LABELS,
  ACTIVITY_KIND_LABELS,
} from "@/features/activities/schema"
import type { ActivityListItem } from "@/features/activities/queries"
import type {
  AgendaItem,
  DashboardMetric,
  TeamStatusRow,
} from "@/features/dashboard/queries"

/* ------------------------------------------------------------------ */

const METRIC_ICONS: Record<string, typeof Building2Icon> = {
  companies: Building2Icon,
  unassigned: UserRoundIcon,
  "follow-ups": ClockAlertIcon,
  "active-processes": TargetIcon,
}

export function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4">
      {metrics.map((m) => {
        const Icon = METRIC_ICONS[m.key] ?? CircleDotIcon
        return (
          <div key={m.key} className="bg-card flex flex-col gap-1 px-4 py-3.5">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate text-xs font-medium">{m.label}</span>
            </div>
            <span
              className={cn(
                "font-heading text-2xl leading-none font-semibold tabular-nums",
                m.key === "unassigned" && m.value > 0 && "text-warning-foreground",
                m.key === "follow-ups" && m.value > 0 && "text-destructive"
              )}
            >
              {m.value}
            </span>
            <span className="text-muted-foreground truncate text-[0.6875rem]">
              {m.hint}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function TodayAgenda({
  items,
  isTeam,
}: {
  items: AgendaItem[]
  isTeam: boolean
}) {
  return (
    <Panel>
      <PanelHeader
        title="Bugün"
        description={
          isTeam
            ? "Ekibin bugünkü görüşme, takip ve görevleri"
            : "Bugünkü görüşme, takip ve görevlerin"
        }
        action={{ label: "Planlama", href: "/tasks" }}
      />
      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={CircleDotIcon}
            title="Bugün için planlanmış bir iş yok"
            description="Görev ve takipler tarih aldığında burada, zaman sırasına göre listelenir."
          />
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="hover:bg-muted/40 flex items-start gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "w-12 shrink-0 pt-0.5 text-xs font-semibold tabular-nums",
                    item.overdue ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {item.allDay ? "Gün içi" : formatTime(item.dueAt!)}
                </span>
                <span
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    item.kind === "follow-up"
                      ? "bg-brand"
                      : "bg-muted-foreground/40"
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {item.company ?? item.title}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {item.company ? item.title : item.process}
                    {item.overdue ? (
                      <span className="text-destructive"> · gecikmiş</span>
                    ) : null}
                  </span>
                </div>
                {item.ownerName ? (
                  <span className="text-muted-foreground shrink-0 pt-0.5 text-xs">
                    {item.ownerName}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

export function TeamStatusPanel({
  rows,
  unassigned,
}: {
  rows: TeamStatusRow[]
  unassigned: number
}) {
  return (
    <Panel>
      <PanelHeader
        title="Ekip Durumu"
        description="Kimde kaç firma var ve kimin takip bekleyen işi var"
        action={{ label: "Ekip", href: "/team" }}
      />
      <ul className="divide-border divide-y">
        {rows.map((r) => (
          <li key={r.membershipId}>
            <Link
              href={`/companies?owner=${r.membershipId}`}
              className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="flex items-center gap-1.5 truncate font-medium">
                {r.name}
                {r.isCurrentUser ? (
                  <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[0.625rem]">
                    Sen
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {r.companies} firma
                <span
                  className={cn(
                    "ml-2",
                    r.followUps > 0 && "text-destructive font-medium"
                  )}
                >
                  {r.followUps} takip
                </span>
              </span>
            </Link>
          </li>
        ))}
        {unassigned > 0 ? (
          <li>
            <Link
              href="/companies?owner=unassigned"
              className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <span className="font-medium">Atanmamış</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {unassigned} firma
              </span>
            </Link>
          </li>
        ) : null}
      </ul>
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
                <p className="truncate text-sm leading-snug">
                  {a.title?.trim() ||
                    (a.kind === "STAGE_CHANGE"
                      ? ACTIVITY_KIND_LABELS[a.kind]
                      : `${ACTIVITY_CHANNEL_LABELS[a.channel]} · ${ACTIVITY_KIND_LABELS[a.kind]}`)}
                </p>
                <span className="text-muted-foreground truncate text-xs">
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
