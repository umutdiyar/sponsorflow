import {
  Building2Icon,
  CalendarClockIcon,
  SendIcon,
  TargetIcon,
  TrophyIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import type { DashboardMetric } from "@/features/dashboard/queries"

const ICONS: Record<string, LucideIcon> = {
  companies: Building2Icon,
  "active-opportunities": TargetIcon,
  "planned-meetings": CalendarClockIcon,
  "sent-proposals": SendIcon,
  "won-sponsors": TrophyIcon,
  "potential-value": WalletIcon,
}

export function MetricStrip({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 xl:grid-cols-6">
      {metrics.map((m) => {
        const Icon = ICONS[m.key] ?? TargetIcon
        return (
          <div key={m.key} className="bg-card flex flex-col gap-1 px-3.5 py-3">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate text-xs font-medium">{m.label}</span>
            </div>
            <span className="font-heading text-lg leading-tight font-semibold tracking-tight tabular-nums">
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
