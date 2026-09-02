import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { ComingSoonButton } from "@/components/common/coming-soon-button"
import { StatStrip } from "@/features/dashboard/components/stat-strip"
import { WeeklyFocus } from "@/features/dashboard/components/weekly-focus"
import { ActionCenter } from "@/features/dashboard/components/action-center"
import { PipelineSummary } from "@/features/dashboard/components/pipeline-summary"
import { RecentActivities } from "@/features/dashboard/components/recent-activities"
import { QuickPipelineTable } from "@/features/dashboard/components/quick-pipeline-table"
import {
  KPIS,
  PIPELINE_ROWS,
  PIPELINE_SUMMARY,
  RECENT_ACTIVITIES,
  TODAY_TASKS,
  WEEKLY_FOCUS,
} from "@/features/dashboard/mock-data"

export const metadata: Metadata = {
  title: "Genel Bakış",
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Genel Bakış"
        description="Sponsorluk süreçlerinin güncel durumunu takip et."
        actions={
          <ComingSoonButton hint="Firma ekleme yakında eklenecek.">
            <PlusIcon />
            Firma Ekle
          </ComingSoonButton>
        }
      />

      <StatStrip items={KPIS} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ActionCenter tasks={TODAY_TASKS} />
          <QuickPipelineTable rows={PIPELINE_ROWS} />
        </div>
        <div className="flex flex-col gap-5">
          <WeeklyFocus data={WEEKLY_FOCUS} />
          <PipelineSummary stages={PIPELINE_SUMMARY} />
          <RecentActivities activities={RECENT_ACTIVITIES} />
        </div>
      </div>
    </div>
  )
}
