import { Panel, PanelHeader } from "@/components/common/panel"
import { StageBadge } from "@/features/dashboard/components/stage-badge"
import type { PipelineRow } from "@/features/dashboard/types"

type QuickPipelineTableProps = {
  rows: PipelineRow[]
}

export function QuickPipelineTable({ rows }: QuickPipelineTableProps) {
  return (
    <Panel>
      <PanelHeader
        title="Hızlı Pipeline"
        description="Öne çıkan açık fırsatlar"
        action={{ label: "Tüm fırsatlar", href: "/opportunities" }}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-2 font-medium">Firma</th>
              <th className="px-4 py-2 font-medium">Aşama</th>
              <th className="px-4 py-2 font-medium">Sorumlu</th>
              <th className="px-4 py-2 font-medium">Son Aktivite</th>
              <th className="w-full px-4 py-2 font-medium">Sonraki Aksiyon</th>
              <th className="px-4 py-2 text-right font-medium">
                Potansiyel Değer
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/40">
                <td className="px-4 py-2.5 font-medium">{row.company}</td>
                <td className="px-4 py-2.5">
                  <StageBadge stage={row.stage} />
                </td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {row.owner}
                </td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {row.lastActivity}
                </td>
                <td className="text-muted-foreground w-full px-4 py-2.5">
                  {row.nextAction}
                </td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
