import type { Kpi } from "@/features/dashboard/types"

type KpiCardsProps = {
  items: Kpi[]
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((kpi) => (
        <div
          key={kpi.key}
          className="border-border bg-card flex flex-col gap-2 rounded-xl border p-3"
        >
          <div className="text-muted-foreground flex items-center gap-1.5">
            <kpi.icon className="size-3.5" />
            <span className="text-xs font-medium">{kpi.label}</span>
          </div>
          <span className="font-heading text-xl font-semibold tracking-tight tabular-nums">
            {kpi.value}
          </span>
          <span className="text-muted-foreground text-xs">{kpi.hint}</span>
        </div>
      ))}
    </div>
  )
}
