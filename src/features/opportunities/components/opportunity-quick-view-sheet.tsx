"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeftIcon,
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { describeDue, formatDate, formatMoney } from "@/lib/format"
import { fetchOpportunityQuickView } from "@/features/opportunities/actions"
import type { OpportunityQuickView } from "@/features/opportunities/actions"
import { StagePill } from "@/features/opportunities/components/stage-pill"
import { StageChangeDialog } from "@/features/opportunities/components/stage-change-dialog"
import { NextActionDialog } from "@/features/opportunities/components/next-action-dialog"
import { ActivityTimeline } from "@/features/activities/components/activity-timeline"
import { QuickLogCommunication } from "@/features/activities/components/activity-quick-add"
import { TaskMiniList } from "@/features/tasks/components/task-mini-list"
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet"
import type { StageRef, MemberRef, CompanyRef } from "@/lib/org/reference"
import type { OpportunityOption } from "@/features/opportunities/queries"

type Props = {
  opportunityId: string | null
  onOpenChange: (open: boolean) => void
  stages: StageRef[]
  members: MemberRef[]
  companies: CompanyRef[]
  opportunityOptions: OpportunityOption[]
  can: {
    update: boolean
    changeStage: boolean
    createActivity: boolean
    createTask: boolean
  }
  onMutated?: () => void
}

export function OpportunityQuickViewSheet({
  opportunityId,
  onOpenChange,
  stages,
  members,
  companies,
  opportunityOptions,
  can,
  onMutated,
}: Props) {
  const router = useRouter()
  const [state, setState] = useState<{
    id: string
    data: OpportunityQuickView | null
  } | null>(null)
  const [nonce, setNonce] = useState(0)
  const [stageOpen, setStageOpen] = useState(false)
  const [nextOpen, setNextOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  useEffect(() => {
    if (!opportunityId) return
    let cancelled = false
    fetchOpportunityQuickView(opportunityId)
      .then((result) => {
        if (!cancelled) setState({ id: opportunityId, data: result })
      })
      .catch(() => {
        if (!cancelled) setState({ id: opportunityId, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [opportunityId, nonce])

  function refresh() {
    setNonce((n) => n + 1)
    router.refresh()
    onMutated?.()
  }

  const data =
    state && state.id === opportunityId ? state.data : null
  const o = data?.opportunity
  const due = o ? describeDue(o.nextActionAt) : null

  return (
    <>
      <Sheet
        open={opportunityId !== null}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false)
        }}
      >
        <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
          {!o ? (
            <div className="flex flex-col gap-4 p-4">
              <SheetHeader className="sr-only">
                <SheetTitle>Fırsat hızlı görünümü</SheetTitle>
              </SheetHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <SheetHeader className="gap-2 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <SheetDescription>
                      <Link
                        href={`/companies/${o.companyId}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {o.companyName}
                      </Link>
                    </SheetDescription>
                    <SheetTitle className="truncate">{o.title}</SheetTitle>
                  </div>
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline underline-offset-2"
                  >
                    Tam sayfa
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <StagePill name={o.stage.name} type={o.stage.type} />
                  {o.owner ? (
                    <span className="text-muted-foreground">
                      {o.owner.name}
                    </span>
                  ) : null}
                  {o.estimatedValue != null ? (
                    <span className="font-medium tabular-nums">
                      {formatMoney(o.estimatedValue, o.currency)}
                    </span>
                  ) : null}
                  {o.packageName ? (
                    <span className="text-muted-foreground">
                      {o.packageName}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {can.createActivity ? (
                    <Button size="sm" onClick={() => setLogOpen(true)}>
                      <PlusIcon />
                      İletişim Kaydet
                    </Button>
                  ) : null}
                  {can.createTask ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTaskOpen(true)}
                    >
                      <PlusIcon />
                      Görev
                    </Button>
                  ) : null}
                  {can.changeStage ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStageOpen(true)}
                    >
                      <ArrowRightLeftIcon />
                      Aşama
                    </Button>
                  ) : null}
                  {can.update ? (
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link href={`/opportunities/${o.id}`} />
                      }
                      nativeButton={false}
                    >
                      <PencilIcon />
                      Düzenle
                    </Button>
                  ) : null}
                </div>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                {/* Next action */}
                <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Sonraki aksiyon
                  </span>
                  {o.nextAction ? (
                    <>
                      <p>{o.nextAction}</p>
                      {o.nextActionAt ? (
                        <p
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            due?.tone === "overdue" && "text-destructive",
                            due?.tone === "today" && "text-warning-foreground"
                          )}
                        >
                          <CalendarClockIcon className="size-3.5" />
                          {due?.label} · {formatDate(o.nextActionAt)}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Planlanmış adım yok.
                    </p>
                  )}
                  {can.update ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 self-start"
                      onClick={() => setNextOpen(true)}
                    >
                      {o.nextAction ? "Düzenle" : "Ekle"}
                    </Button>
                  ) : null}
                </div>

                {/* Tasks */}
                <section className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Görevler ({data.tasks.filter((t) => t.status !== "DONE").length}
                    )
                  </h3>
                  {data.tasks.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Bağlı görev yok.
                    </p>
                  ) : (
                    <TaskMiniList
                      tasks={data.tasks}
                      canUpdate={can.createTask}
                      onChanged={() => refresh()}
                    />
                  )}
                </section>

                {/* Timeline */}
                <section className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Zaman çizelgesi
                  </h3>
                  <ActivityTimeline activities={data.activities} />
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {o ? (
        <>
          <StageChangeDialog
            open={stageOpen}
            onOpenChange={setStageOpen}
            opportunityId={o.id}
            currentStageId={o.stage.id}
            currentLostReason={o.lostReason}
            stages={stages}
            onChanged={refresh}
          />
          <NextActionDialog
            open={nextOpen}
            onOpenChange={setNextOpen}
            opportunityId={o.id}
            nextAction={o.nextAction}
            nextActionAt={o.nextActionAt}
            onSaved={refresh}
          />
          <QuickLogCommunication
            open={logOpen}
            onOpenChange={setLogOpen}
            opportunityId={o.id}
            contacts={data.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              linkedinUrl: c.linkedinUrl,
            }))}
            onLogged={() => refresh()}
          />
          <TaskFormSheet
            open={taskOpen}
            onOpenChange={setTaskOpen}
            members={members}
            companies={companies}
            opportunities={opportunityOptions}
            defaults={{ opportunityId: o.id, companyId: o.companyId }}
            onSaved={() => refresh()}
          />
        </>
      ) : null}
    </>
  )
}
