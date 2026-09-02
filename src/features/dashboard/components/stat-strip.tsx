import type { Kpi } from "@/features/dashboard/types"

type StatStripProps = {
  items: Kpi[]
}

/**
 * Compact KPI row — a single bordered strip split into cells, not a wall of
 * cards. Wraps to 2/3 columns on narrow viewports.
 */
export function StatStrip({ items }: StatStripProps) {
  return (
    <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 xl:grid-cols-6">
      {items.map((kpi) => (
        <div
          key={kpi.key}
          className="bg-card flex flex-col gap-1 px-3.5 py-3"
        >
          <div className="text-muted-foreground flex items-center gap-1.5">
            <kpi.icon className="size-3.5 shrink-0" />
            <span className="truncate text-xs font-medium">{kpi.label}</span>
          </div>
          <span className="font-heading text-lg leading-tight font-semibold tracking-tight tabular-nums">
            {kpi.value}
          </span>
          <span className="text-muted-foreground truncate text-[0.6875rem]">
            {kpi.hint}
          </span>
        </div>
      ))}
    </div>
  )
}
