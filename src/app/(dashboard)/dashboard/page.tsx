import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requireMembership } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { listCompanyOptions } from "@/lib/org/reference"
import { MetricStrip } from "@/features/dashboard/components/metric-strip"
import {
  MyWorkStrip,
  RecentActivityPanel,
  StageProgress,
  TeamWorkloadPanel,
  TodayPanel,
  UpcomingStrip,
} from "@/features/dashboard/components/dashboard-sections"
import { getDashboardData } from "@/features/dashboard/queries"
import { getCurrentWeeklyFocus } from "@/features/weekly-focus/queries"
import { WeeklyFocusPanel } from "@/features/weekly-focus/components/weekly-focus-panel"

export const metadata: Metadata = { title: "Genel Bakış" }

export default async function DashboardPage() {
  const membership = await requireMembership()
  const isLead = hasPermission(membership.role, "focus:manage")

  const [data, focus, focusCompanies] = await Promise.all([
    getDashboardData({
      organizationId: membership.organizationId,
      membershipId: membership.membershipId,
      isLead,
    }),
    getCurrentWeeklyFocus(membership.organizationId),
    isLead
      ? listCompanyOptions(membership.organizationId)
      : Promise.resolve([]),
  ])

  const canCreateCompany = hasPermission(membership.role, "company:create")

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Genel Bakış"
        description="Bugün ne yapman gerektiği ve ekibin sponsorluk süreci."
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
      <MyWorkStrip work={data.myWork} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <TodayPanel items={data.agenda} overdueCount={data.overdueCount} />
          <RecentActivityPanel activities={data.recentActivities} />
        </div>
        <div className="flex flex-col gap-5">
          <WeeklyFocusPanel
            focus={focus}
            companies={focusCompanies}
            canManage={isLead}
          />
          <UpcomingStrip items={data.agenda} />
          <StageProgress stages={data.stageSummary} currency={data.currency} />
          {data.workload ? (
            <TeamWorkloadPanel
              rows={data.workload}
              unassigned={data.unassignedCompanies}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
