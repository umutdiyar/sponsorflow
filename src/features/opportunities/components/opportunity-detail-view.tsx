"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { describeDue, formatDate, formatMoney } from "@/lib/format"
import { StagePill } from "@/features/opportunities/components/stage-pill"
import {
  OpportunityFormSheet,
  type OpportunityFormTarget,
} from "@/features/opportunities/components/opportunity-form-sheet"
import { StageChangeDialog } from "@/features/opportunities/components/stage-change-dialog"
import { NextActionDialog } from "@/features/opportunities/components/next-action-dialog"
import { ArchiveOpportunityDialog } from "@/features/opportunities/components/archive-opportunity-dialog"
import { ActivityQuickAdd } from "@/features/activities/components/activity-quick-add"
import { ActivityTimeline } from "@/features/activities/components/activity-timeline"
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet"
import { TaskMiniList } from "@/features/tasks/components/task-mini-list"
import type { ActivityListItem } from "@/features/activities/queries"
import type {
  OpportunityDetail,
  OpportunityOption,
} from "@/features/opportunities/queries"
import type { TaskRow } from "@/features/tasks/queries"
import type {
  CompanyRef,
  ContactOptionRef,
  MemberRef,
  PackageRef,
  StageRef,
} from "@/lib/org/reference"

type Can = {
  update: boolean
  changeStage: boolean
  archive: boolean
  createActivity: boolean
  createTask: boolean
}

type Props = {
  opportunity: OpportunityDetail
  activities: ActivityListItem[]
  tasks: TaskRow[]
  contacts: ContactOptionRef[]
  members: MemberRef[]
  stages: StageRef[]
  packages: PackageRef[]
  companies: CompanyRef[]
  can: Can
}

export function OpportunityDetailView({
  opportunity: o,
  activities: initialActivities,
  tasks: initialTasks,
  contacts,
  members,
  stages,
  packages,
  companies,
  can,
}: Props) {
  const [activities, setActivities] = useState(initialActivities)
  const [tasks, setTasks] = useState(initialTasks)

  // Re-sync local lists whenever the server sends fresh data (e.g. after a
  // router.refresh triggered by an edit).
  const activitySig = initialActivities.map((a) => a.id).join(",")
  const [prevActivitySig, setPrevActivitySig] = useState(activitySig)
  if (activitySig !== prevActivitySig) {
    setPrevActivitySig(activitySig)
    setActivities(initialActivities)
  }

  const taskSig = initialTasks.map((t) => `${t.id}:${t.status}`).join(",")
  const [prevTaskSig, setPrevTaskSig] = useState(taskSig)
  if (taskSig !== prevTaskSig) {
    setPrevTaskSig(taskSig)
    setTasks(initialTasks)
  }

  const [editOpen, setEditOpen] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [nextOpen, setNextOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const formTarget: OpportunityFormTarget = {
    id: o.id,
    companyId: o.companyId,
    title: o.title,
    ownerMembershipId: o.ownerMembershipId,
    stageId: o.stage.id,
    packageId: o.packageId,
    estimatedValue: o.estimatedValue,
    probability: o.probability,
    nextAction: o.nextAction,
    nextActionAt: o.nextActionAt,
    expectedCloseDate: o.expectedCloseDate,
  }

  const opportunityOptions: OpportunityOption[] = [
    {
      id: o.id,
      title: o.title,
      companyId: o.companyId,
      companyName: o.companyName,
    },
  ]

  const openTasks = tasks.filter(
    (t) => t.status !== "DONE" && t.status !== "CANCELLED"
  )
  const doneTasks = tasks.filter((t) => t.status === "DONE")
  const due = describeDue(o.nextActionAt)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Link
        href="/opportunities"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon className="size-4" />
        Fırsatlar
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link
            href={`/companies/${o.companyId}`}
            className="text-muted-foreground hover:text-foreground w-fit text-sm hover:underline"
          >
            {o.companyName}
            {o.companyIndustry ? ` · ${o.companyIndustry}` : ""}
          </Link>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {o.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <StagePill name={o.stage.name} type={o.stage.type} />
            {o.owner ? (
              <span className="text-muted-foreground">{o.owner.name}</span>
            ) : null}
            {o.estimatedValue != null ? (
              <span className="font-medium tabular-nums">
                {formatMoney(o.estimatedValue, o.currency)}
              </span>
            ) : null}
            {o.packageName ? (
              <span className="text-muted-foreground">{o.packageName}</span>
            ) : null}
            {o.archivedAt ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                Arşivlenmiş
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can.createActivity ? (
            <Button size="sm" onClick={() => setActivityOpen(true)}>
              <PlusIcon />
              Aktivite Ekle
            </Button>
          ) : null}
          {can.createTask ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTaskOpen(true)}
            >
              <PlusIcon />
              Görev Ekle
            </Button>
          ) : null}
          {can.changeStage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStageOpen(true)}
            >
              <ArrowRightLeftIcon />
              Aşamayı Değiştir
            </Button>
          ) : null}
          {can.update ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <PencilIcon />
              Düzenle
            </Button>
          ) : null}
          {can.archive && !o.archivedAt ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setArchiveOpen(true)}
            >
              <ArchiveIcon />
              Arşivle
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
        {/* Main — activity timeline */}
        <Panel className="min-w-0">
          <PanelHeader
            title="Zaman çizelgesi"
            description={`${o.activityCount} kayıt`}
          />
          <PanelContent>
            <ActivityTimeline activities={activities} />
          </PanelContent>
        </Panel>

        {/* Side */}
        <div className="flex min-w-0 flex-col gap-5">
          <Panel>
            <PanelHeader title="Sonraki aksiyon" />
            <PanelContent className="flex flex-col gap-3">
              {o.nextAction ? (
                <>
                  <p className="text-sm">{o.nextAction}</p>
                  {o.nextActionAt ? (
                    <p
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        due.tone === "overdue" && "text-destructive",
                        due.tone === "today" && "text-warning-foreground"
                      )}
                    >
                      <CalendarClockIcon className="size-3.5" />
                      {due.label} · {formatDate(o.nextActionAt)}
                    </p>
                  ) : null}
                  {can.update ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNextOpen(true)}
                      >
                        Düzenle
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Planlanmış bir sonraki adım yok.
                  </p>
                  {can.update ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNextOpen(true)}
                    >
                      <PlusIcon />
                      Ekle
                    </Button>
                  ) : null}
                </>
              )}
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader title="Fırsat detayları" />
            <PanelContent className="flex flex-col">
              <Row label="Aşama" value={o.stage.name} />
              <Row label="Sorumlu" value={o.owner?.name ?? "Atanmamış"} />
              <Row
                label="Tahmini değer"
                value={
                  o.estimatedValue != null
                    ? formatMoney(o.estimatedValue, o.currency)
                    : "—"
                }
              />
              <Row
                label="Olasılık"
                value={o.probability != null ? `%${o.probability}` : "—"}
              />
              <Row label="Paket" value={o.packageName ?? "—"} />
              <Row
                label="Beklenen kapanış"
                value={
                  o.expectedCloseDate
                    ? formatDate(o.expectedCloseDate)
                    : "—"
                }
              />
              {o.stage.type === "LOST" && o.lostReason ? (
                <Row label="Kayıp nedeni" value={o.lostReason} />
              ) : null}
              <Row label="Oluşturan" value={o.createdByName} />
              <Row label="Oluşturuldu" value={formatDate(o.createdAt)} />
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader
              title="Görevler"
              description={`${openTasks.length} açık`}
            />
            <PanelContent>
              {openTasks.length === 0 && doneTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Bu fırsata bağlı görev yok.
                </p>
              ) : (
                <TaskMiniList
                  tasks={[...openTasks, ...doneTasks]}
                  canUpdate={can.createTask}
                  onChanged={(id, done) =>
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.id === id
                          ? {
                              ...t,
                              status: done ? "DONE" : "TODO",
                              completedAt: done ? new Date() : null,
                            }
                          : t
                      )
                    )
                  }
                />
              )}
              {can.createTask ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setTaskOpen(true)}
                >
                  <PlusIcon />
                  Görev Ekle
                </Button>
              ) : null}
            </PanelContent>
          </Panel>
        </div>
      </div>

      {/* Dialogs / sheets */}
      <OpportunityFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        companies={companies}
        members={members}
        stages={stages}
        packages={packages}
        opportunity={formTarget}
      />
      <StageChangeDialog
        open={stageOpen}
        onOpenChange={setStageOpen}
        opportunityId={o.id}
        currentStageId={o.stage.id}
        currentLostReason={o.lostReason}
        stages={stages}
        onChanged={() => {}}
      />
      <NextActionDialog
        open={nextOpen}
        onOpenChange={setNextOpen}
        opportunityId={o.id}
        nextAction={o.nextAction}
        nextActionAt={o.nextActionAt}
        onSaved={() => {}}
      />
      <ActivityQuickAdd
        open={activityOpen}
        onOpenChange={setActivityOpen}
        opportunityId={o.id}
        contacts={contacts}
        onLogged={(a) => setActivities((prev) => [a, ...prev])}
      />
      <TaskFormSheet
        open={taskOpen}
        onOpenChange={setTaskOpen}
        members={members}
        companies={companies}
        opportunities={opportunityOptions}
        defaults={{ opportunityId: o.id, companyId: o.companyId }}
      />
      <ArchiveOpportunityDialog
        target={archiveOpen ? { id: o.id, title: o.title } : null}
        onOpenChange={setArchiveOpen}
        redirectTo="/opportunities"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="max-w-[62%] text-right font-medium">{value}</span>
    </div>
  )
}
