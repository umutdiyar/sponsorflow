"use client"

import { useCallback, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  InboxIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean"
import { Button } from "@/components/ui/button"
import {
  addDaysToKey,
  formatDayMonth,
  formatWeekdayShort,
  istanbulDayKey,
  istanbulWeekBounds,
} from "@/lib/format"
import {
  archiveTask,
  updateTaskDue,
  updateTaskStatus,
} from "@/features/tasks/actions"
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge"
import {
  TaskFormSheet,
  type TaskFormTarget,
} from "@/features/tasks/components/task-form-sheet"
import type { TaskRow, TaskScope } from "@/features/tasks/queries"
import type { CompanyRef, MemberRef } from "@/lib/org/reference"
import type { OpportunityOption } from "@/features/opportunities/queries"

const UNSCHEDULED = "unscheduled"

type Props = {
  tasks: TaskRow[]
  members: MemberRef[]
  companies: CompanyRef[]
  opportunities: OpportunityOption[]
  scope: TaskScope
  canCreate: boolean
  canUpdate: boolean
  canArchive: boolean
}

export function Planner({
  tasks: serverTasks,
  members,
  companies,
  opportunities,
  scope,
  canCreate,
  canUpdate,
  canArchive,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // Local copy for optimistic drag / done-toggle, resynced when the server set changes.
  const sig = serverTasks
    .map((t) => `${t.id}:${t.dueAt?.getTime() ?? 0}:${t.status}`)
    .join("|")
  const [tasks, setTasks] = useState(serverTasks)
  const [prevSig, setPrevSig] = useState(sig)
  if (sig !== prevSig) {
    setPrevSig(sig)
    setTasks(serverTasks)
  }

  const [weekOffset, setWeekOffset] = useState(0)
  const [showUnscheduled, setShowUnscheduled] = usePersistentBoolean(
    "sponsorflow:planner-unscheduled",
    false
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TaskFormTarget | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const snapshot = useRef<TaskRow[] | null>(null)

  const todayKey = istanbulDayKey(new Date())
  const weekStartKey = useMemo(
    () => addDaysToKey(istanbulWeekBounds().startKey, weekOffset * 7),
    [weekOffset]
  )
  const dayKeys = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStartKey, i)),
    [weekStartKey]
  )
  const weekEndKey = dayKeys[6]

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const buckets = useMemo(() => {
    const days = new Map<string, TaskRow[]>(dayKeys.map((k) => [k, []]))
    const unscheduled: TaskRow[] = []
    const overdue: TaskRow[] = []
    for (const t of tasks) {
      if (!t.dueAt) {
        if (t.status !== "DONE") unscheduled.push(t)
        continue
      }
      const key = istanbulDayKey(t.dueAt)
      if (days.has(key)) {
        days.get(key)!.push(t)
      } else if (
        weekOffset === 0 &&
        key < todayKey &&
        (t.status === "TODO" || t.status === "IN_PROGRESS")
      ) {
        overdue.push(t)
      }
    }
    const byPriority = (a: TaskRow, b: TaskRow) =>
      Number(a.status === "DONE") - Number(b.status === "DONE")
    for (const list of days.values()) list.sort(byPriority)
    return { days, unscheduled, overdue }
  }, [tasks, dayKeys, weekOffset, todayKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const setScope = useCallback(
    (next: TaskScope) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === "all") params.set("scope", "all")
      else params.delete("scope")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  function move(id: string, targetKey: string) {
    const task = byId.get(id)
    if (!task) return
    const currentKey = task.dueAt ? istanbulDayKey(task.dueAt) : UNSCHEDULED
    if (currentKey === targetKey) return

    snapshot.current = tasks
    const nextDue =
      targetKey === UNSCHEDULED
        ? null
        : new Date(`${targetKey}T09:00:00+03:00`)
    setTasks((list) =>
      list.map((t) => (t.id === id ? { ...t, dueAt: nextDue } : t))
    )

    startTransition(async () => {
      // Optimistic only — no router.refresh(); the local move is authoritative
      // until the next real navigation resyncs the server set.
      const result = await updateTaskDue(id, {
        dueAt: targetKey === UNSCHEDULED ? "" : targetKey,
      })
      if (!result.ok) {
        if (snapshot.current) setTasks(snapshot.current)
        toast.error(result.error)
      }
    })
  }

  function toggleDone(task: TaskRow) {
    const done = task.status !== "DONE"
    snapshot.current = tasks
    setTasks((list) =>
      list.map((t) =>
        t.id === task.id
          ? { ...t, status: done ? "DONE" : "TODO" }
          : t
      )
    )
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, {
        status: done ? "DONE" : "TODO",
      })
      if (!result.ok) {
        if (snapshot.current) setTasks(snapshot.current)
        toast.error(result.error)
      }
    })
  }

  function onArchive(task: TaskRow) {
    snapshot.current = tasks
    setTasks((list) => list.filter((t) => t.id !== task.id))
    startTransition(async () => {
      const result = await archiveTask(task.id)
      if (result.ok) toast.success("Görev arşivlendi.")
      else {
        if (snapshot.current) setTasks(snapshot.current)
        toast.error(result.error)
      }
    })
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over || !canUpdate) return
    const overId = String(e.over.id)
    const targetKey = overId.startsWith("day:")
      ? overId.slice(4)
      : overId === UNSCHEDULED
        ? UNSCHEDULED
        : null
    if (targetKey) move(String(e.active.id), targetKey)
  }

  const activeTask = activeId ? (byId.get(activeId) ?? null) : null
  const unscheduledCount = buckets.unscheduled.length

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Önceki hafta"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Bugün
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Sonraki hafta"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <span className="text-sm font-medium">
          {formatDayMonth(`${weekStartKey}T12:00:00+03:00`)} –{" "}
          {formatDayMonth(`${weekEndKey}T12:00:00+03:00`)}
        </span>

        <div className="bg-muted ml-auto inline-flex rounded-lg p-0.5">
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                scope === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "mine" ? "Bana Atanan" : "Tümü"}
            </button>
          ))}
        </div>

        <Button
          variant={showUnscheduled ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnscheduled(!showUnscheduled)}
        >
          <InboxIcon />
          Planlanmamış
          {unscheduledCount > 0 ? (
            <span className="tabular-nums">({unscheduledCount})</span>
          ) : null}
        </Button>

        {canCreate ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Görev
          </Button>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {showUnscheduled ? (
            <UnscheduledRail
              tasks={buckets.unscheduled}
              scope={scope}
              canMove={canUpdate}
              activeId={activeId}
              onToggleDone={toggleDone}
              onEdit={setEditTarget}
              onArchive={canArchive ? onArchive : undefined}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            {weekOffset === 0 && buckets.overdue.length > 0 ? (
              <div className="border-destructive/30 bg-destructive/5 mb-3 flex flex-col gap-2 rounded-xl border p-2.5">
                <span className="text-destructive px-1 text-xs font-semibold">
                  Gecikmiş ({buckets.overdue.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {buckets.overdue.map((t) => (
                    <div key={t.id} className="w-full sm:w-60">
                      <DraggableCard
                        task={t}
                        scope={scope}
                        canMove={canUpdate}
                        dragging={activeId === t.id}
                        overdue
                        onToggleDone={toggleDone}
                        onEdit={setEditTarget}
                        onArchive={canArchive ? onArchive : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
              {dayKeys.map((key) => (
                <DayColumn
                  key={key}
                  dayKey={key}
                  todayKey={todayKey}
                  tasks={buckets.days.get(key) ?? []}
                  scope={scope}
                  canMove={canUpdate}
                  activeId={activeId}
                  onToggleDone={toggleDone}
                  onEdit={setEditTarget}
                  onArchive={canArchive ? onArchive : undefined}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
          {activeTask ? (
            <div className="w-60">
              <PlannerCard task={activeTask} scope={scope} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        companies={companies}
        opportunities={opportunities}
        onSaved={() => router.refresh()}
      />
      <TaskFormSheet
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
        members={members}
        companies={companies}
        opportunities={opportunities}
        task={editTarget}
        onSaved={() => router.refresh()}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function DayColumn({
  dayKey,
  todayKey,
  tasks,
  scope,
  canMove,
  activeId,
  onToggleDone,
  onEdit,
  onArchive,
}: {
  dayKey: string
  todayKey: string
  tasks: TaskRow[]
  scope: TaskScope
  canMove: boolean
  activeId: string | null
  onToggleDone: (t: TaskRow) => void
  onEdit: (t: TaskFormTarget) => void
  onArchive?: (t: TaskRow) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dayKey}`,
    disabled: !canMove,
  })
  const isToday = dayKey === todayKey
  const isPast = dayKey < todayKey

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex min-h-24 flex-col rounded-xl border transition-colors",
        isOver && "border-brand bg-brand-muted/40",
        isToday && "border-brand/60"
      )}
    >
      <header className="flex items-baseline justify-between gap-2 border-b px-2.5 py-2">
        <span
          className={cn(
            "text-xs font-semibold",
            isToday ? "text-brand-foreground" : "text-foreground",
            isPast && !isToday && "text-muted-foreground"
          )}
        >
          {formatWeekdayShort(`${dayKey}T12:00:00+03:00`)}{" "}
          <span className="text-muted-foreground font-normal">
            {dayKey.slice(8)}
          </span>
        </span>
        {tasks.length > 0 ? (
          <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
            {tasks.length}
          </span>
        ) : null}
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            scope={scope}
            canMove={canMove}
            dragging={activeId === task.id}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onArchive={onArchive}
          />
        ))}
      </div>
    </section>
  )
}

function UnscheduledRail({
  tasks,
  scope,
  canMove,
  activeId,
  onToggleDone,
  onEdit,
  onArchive,
}: {
  tasks: TaskRow[]
  scope: TaskScope
  canMove: boolean
  activeId: string | null
  onToggleDone: (t: TaskRow) => void
  onEdit: (t: TaskFormTarget) => void
  onArchive?: (t: TaskRow) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNSCHEDULED,
    disabled: !canMove,
  })
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex shrink-0 flex-col rounded-xl border transition-colors lg:w-64",
        isOver && "border-brand bg-brand-muted/40"
      )}
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Planlanmamış</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {tasks.length}
        </span>
      </header>
      <div className="flex flex-col gap-2 p-2">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground/70 px-1 py-6 text-center text-xs">
            Tarihi olmayan görev yok. Kartları buraya sürükleyerek tarihini
            kaldırabilirsin.
          </p>
        ) : (
          tasks.map((task) => (
            <DraggableCard
              key={task.id}
              task={task}
              scope={scope}
              canMove={canMove}
              dragging={activeId === task.id}
              onToggleDone={onToggleDone}
              onEdit={onEdit}
              onArchive={onArchive}
            />
          ))
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function DraggableCard({
  task,
  scope,
  canMove,
  dragging,
  overdue,
  onToggleDone,
  onEdit,
  onArchive,
}: {
  task: TaskRow
  scope: TaskScope
  canMove: boolean
  dragging: boolean
  overdue?: boolean
  onToggleDone: (t: TaskRow) => void
  onEdit: (t: TaskFormTarget) => void
  onArchive?: (t: TaskRow) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } =
    useDraggable({ id: task.id, disabled: !canMove })
  return (
    <div ref={setNodeRef}>
      <PlannerCard
        task={task}
        scope={scope}
        canMove={canMove}
        dragging={dragging}
        overdue={overdue}
        handleRef={canMove ? setActivatorNodeRef : undefined}
        handleProps={canMove ? { ...attributes, ...listeners } : undefined}
        onToggleDone={onToggleDone}
        onEdit={onEdit}
        onArchive={onArchive}
      />
    </div>
  )
}

function toFormTarget(t: TaskRow): TaskFormTarget {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assignedToMembershipId: t.assignedToMembershipId,
    companyId: t.companyId,
    opportunityId: t.opportunityId,
    priority: t.priority,
    status: t.status,
    dueAt: t.dueAt,
  }
}

function PlannerCard({
  task,
  scope,
  overlay,
  dragging,
  canMove,
  overdue,
  handleRef,
  handleProps,
  onToggleDone,
  onEdit,
  onArchive,
}: {
  task: TaskRow
  scope: TaskScope
  overlay?: boolean
  dragging?: boolean
  canMove?: boolean
  overdue?: boolean
  handleRef?: (el: HTMLButtonElement | null) => void
  handleProps?: Record<string, unknown>
  onToggleDone?: (t: TaskRow) => void
  onEdit?: (t: TaskFormTarget) => void
  onArchive?: (t: TaskRow) => void
}) {
  const done = task.status === "DONE"
  return (
    <div
      onClick={onEdit ? () => onEdit(toFormTarget(task)) : undefined}
      className={cn(
        "group/task bg-card ring-foreground/10 flex flex-col gap-1.5 rounded-lg p-2.5 text-sm ring-1 transition-all",
        onEdit && "cursor-pointer hover:ring-foreground/20 hover:shadow-sm",
        overlay && "shadow-lg",
        dragging && "opacity-40",
        overdue && "ring-destructive/30"
      )}
    >
      <div className="flex items-start gap-1.5">
        {onToggleDone ? (
          <button
            type="button"
            aria-label="Tamamlandı"
            onClick={(e) => {
              e.stopPropagation()
              onToggleDone(task)
            }}
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
              done
                ? "border-success bg-success text-success-foreground"
                : "border-input hover:border-foreground"
            )}
          >
            {done ? <CheckIcon className="size-3" /> : null}
          </button>
        ) : null}
        <span
          className={cn(
            "line-clamp-2 flex-1 font-medium",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
        {canMove ? (
          <button
            type="button"
            aria-label="Görevi taşı"
            ref={handleRef}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted -mr-1 shrink-0 cursor-grab touch-none rounded p-0.5 opacity-60 transition-opacity group-hover/task:opacity-100 active:cursor-grabbing"
            {...handleProps}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <TaskPriorityBadge priority={task.priority} />
        {scope === "all" && task.assignee ? (
          <span>{task.assignee.name}</span>
        ) : null}
        {overdue ? (
          <span className="text-destructive font-medium">gecikmiş</span>
        ) : null}
      </div>

      {task.companyName ? (
        task.opportunityId ? (
          <Link
            href={`/opportunities/${task.opportunityId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground truncate text-xs hover:underline"
          >
            {task.companyName}
            {task.opportunityTitle ? ` · ${task.opportunityTitle}` : ""}
          </Link>
        ) : (
          <span className="text-muted-foreground truncate text-xs">
            {task.companyName}
          </span>
        )
      ) : null}

      {onArchive && !overlay ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onArchive(task)
          }}
          className="text-muted-foreground/0 hover:text-destructive group-hover/task:text-muted-foreground -mt-0.5 self-end text-[0.6875rem] transition-colors"
        >
          Arşivle
        </button>
      ) : null}
    </div>
  )
}
