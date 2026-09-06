"use client"

import { useState } from "react"
import { TargetIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { formatDayMonth } from "@/lib/format"
import { ManageFocusSheet } from "@/features/weekly-focus/components/manage-focus-sheet"
import type { WeeklyFocusData } from "@/features/weekly-focus/queries"
import type { CompanyRef } from "@/lib/org/reference"

type Props = {
  focus: WeeklyFocusData | null
  companies: CompanyRef[]
  canManage: boolean
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 flex flex-col gap-0.5 rounded-lg px-2 py-2 text-center">
      <span className="font-heading text-lg leading-none font-semibold tabular-nums">
        {value}
      </span>
      <span className="text-muted-foreground text-[0.6875rem]">{label}</span>
    </div>
  )
}

export function WeeklyFocusPanel({ focus, companies, canManage }: Props) {
  const [manageOpen, setManageOpen] = useState(false)

  const target =
    focus?.targetCompanyCount && focus.targetCompanyCount > 0
      ? focus.targetCompanyCount
      : (focus?.progress.total ?? 0)
  const pct =
    target > 0 && focus
      ? Math.min(100, Math.round((focus.progress.contacted / target) * 100))
      : 0

  return (
    <>
      <Panel>
        <PanelHeader
          title="Bu Haftanın Odağı"
          description={
            focus
              ? `${formatDayMonth(focus.startDate)} – ${formatDayMonth(focus.endDate)}`
              : "Henüz belirlenmedi"
          }
          action={
            canManage
              ? { label: "Odağı Yönet", onClick: () => setManageOpen(true) }
              : undefined
          }
        />
        <PanelContent className="flex flex-col gap-3">
          {!focus || focus.progress.total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <TargetIcon className="text-muted-foreground size-5" />
              <p className="text-muted-foreground text-sm">
                Bu hafta odaklanacağınız firmaları seçin.
              </p>
              {canManage ? (
                <Button size="sm" onClick={() => setManageOpen(true)}>
                  Firmaları Seç
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <span className="font-heading text-2xl leading-none font-semibold tabular-nums">
                  {focus.progress.contacted}
                  <span className="text-muted-foreground text-sm font-normal">
                    {" / "}
                    {target} iletişim
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
              >
                <div
                  className="bg-brand h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <Stat label="hedef firma" value={focus.progress.total} />
                <Stat label="dönüş" value={focus.progress.replied} />
                <Stat label="görüşme" value={focus.progress.meeting} />
              </div>
            </>
          )}
        </PanelContent>
      </Panel>

      {canManage ? (
        <ManageFocusSheet
          open={manageOpen}
          onOpenChange={setManageOpen}
          companies={companies}
          selectedIds={focus?.companies.map((c) => c.id) ?? []}
          targetCount={focus?.targetCompanyCount ?? null}
        />
      ) : null}
    </>
  )
}
