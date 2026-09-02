import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requireMembership } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { WeeklyFocus } from "@/features/dashboard/components/weekly-focus"
import { WEEKLY_FOCUS } from "@/features/dashboard/mock-data"
import { MetricStrip } from "@/features/dashboard/components/metric-strip"
import {
  QuickPipelinePanel,
  RecentActivityPanel,
  StageProgress,
  TodayPanel,
  UpcomingStrip,
} from "@/features/dashboard/components/dashboard-sections"
import { getDashboardData } from "@/features/dashboard/queries"

export const metadata: Metadata = { title: "Genel Bakış" }

export default async function DashboardPage() {
  const membership = await requireMembership()
  const data = await getDashboardData(membership.organizationId)
  const canCreateCompany = hasPermission(membership.role, "company:create")

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Genel Bakış"
        description="Sponsorluk süreçlerinin güncel durumunu takip et."
        actions={
          canCreateCompany ? (
            <Button
              render={<Link href="/companies?new=1" />}
              nativeButton={false}
            >
              <PlusIcon />
              Firma Ekle
            </Button>
          ) : undefined
        }
      />

      <MetricStrip metrics={data.metrics} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <TodayPanel items={data.agenda} />
          <QuickPipelinePanel rows={data.quickPipeline} />
        </div>
        <div className="flex flex-col gap-5">
          <UpcomingStrip items={data.agenda} />
          <WeeklyFocus data={WEEKLY_FOCUS} />
          <StageProgress
            stages={data.stageSummary}
            currency={data.currency}
          />
          <RecentActivityPanel activities={data.recentActivities} />
        </div>
      </div>
    </div>
  )
}
