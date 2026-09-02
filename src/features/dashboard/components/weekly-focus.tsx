import { Panel, PanelHeader, PanelContent } from "@/components/common/panel"
import type { WeeklyFocus as WeeklyFocusData } from "@/features/dashboard/types"

type WeeklyFocusProps = {
  data: WeeklyFocusData
}

/**
 * Compact progress panel for the "focus on N target companies this week"
 * working method. Kept deliberately small — it's a summary, not an analytics
 * widget — and shaped so it can later bind to real Campaign/Sprint data.
 */
export function WeeklyFocus({ data }: WeeklyFocusProps) {
  const lead = data.steps[0]?.count ?? 0
  const pct = data.target > 0 ? Math.round((lead / data.target) * 100) : 0

  return (
    <Panel>
      <PanelHeader
        title="Bu Haftanın Odağı"
        description={`${data.target} ${data.targetLabel} · ${data.periodLabel}`}
      />
      <PanelContent className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
            {lead}
            <span className="text-muted-foreground text-sm font-normal">
              {" "}
              / {data.target}
            </span>
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            %{pct}
          </span>
        </div>
        <div
          className="bg-muted h-1.5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Haftalık ilerleme"
        >
          <div
            className="bg-brand h-full rounded-full"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <dl className="mt-1 grid grid-cols-3 gap-2 text-center">
          {data.steps.map((step) => (
            <div
              key={step.key}
              className="bg-muted/50 flex flex-col gap-0.5 rounded-lg px-2 py-2"
            >
              <dt className="text-muted-foreground truncate text-[0.6875rem]">
                {step.label}
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {step.count}
              </dd>
            </div>
          ))}
        </dl>
      </PanelContent>
    </Panel>
  )
}
