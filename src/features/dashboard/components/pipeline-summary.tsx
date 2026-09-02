import { Panel, PanelHeader, PanelContent } from "@/components/common/panel"
import type { PipelineStageSummary } from "@/features/dashboard/types"

type PipelineSummaryProps = {
  stages: PipelineStageSummary[]
}

export function PipelineSummary({ stages }: PipelineSummaryProps) {
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
        {stages.map((stage) => (
          <div key={stage.stage} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-36 shrink-0 truncate text-xs">
              {stage.stage}
            </span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-foreground/70 h-full rounded-full"
                style={{ width: `${(stage.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums">
              {stage.count}
            </span>
          </div>
        ))}
      </PanelContent>
    </Panel>
  )
}
