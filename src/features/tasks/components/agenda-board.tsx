"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  addDaysToKey,
  formatDayMonth,
  formatWeekday,
  istanbulDayKey,
} from "@/lib/format"
import { updateTaskDue } from "@/features/tasks/actions"
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge"
import type { TaskRow } from "@/features/tasks/queries"

const UNSCHEDULED = "unscheduled"
const DAYS_AHEAD = 13

type Props = {
  tasks: TaskRow[]
  canMove: boolean
}

type Buckets = Record<string, TaskRow[]>

function bucketize(tasks: TaskRow[]): Buckets {
  const b: Buckets = {}
  for (const t of tasks) {
    const key = t.dueAt ? istanbulDayKey(t.dueAt) : UNSCHEDULED
    ;(b[key] ??= []).push(t)
  }
  return b
}

export function AgendaBoard({ tasks, canMove }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const todayKey = istanbulDayKey(new Date())
  const dayKeys = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD + 1 }, (_, i) =>
        addDaysToKey(todayKey, i)
      ),
    [todayKey]
  )
  const columnKeys = useMemo(
    () => [UNSCHEDULED, ...dayKeys],
    [dayKeys]
  )

  const signature = tasks
    .map((t) => `${t.id}:${t.dueAt?.getTime() ?? 0}:${t.status}`)
    .join("|")
  const [buckets, setBuckets] = useState<Buckets>(() => bucketize(tasks))
  const [prevSignature, setPrevSignature] = useState(signature)
  if (signature !== prevSignature) {
    setPrevSignature(signature)
    setBuckets(bucketize(tasks))
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  const snapshot = useRef<Buckets | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const index = useMemo(() => {
    const m = new Map<string, { task: TaskRow; key: string }>()
    for (const [key, list] of Object.entries(buckets)) {
      for (const task of list) m.set(task.id, { task, key })
    }
    return m
  }, [buckets])

  const activeTask = activeId ? (index.get(activeId)?.task ?? null) : null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id)
    setActiveId(null)
    if (!e.over) return

    const from = index.get(id)
    if (!from) return
    const toKey = String(e.over.id)
    if (toKey === from.key || !columnKeys.includes(toKey)) return

    snapshot.current = buckets
    setBuckets((prev) => {
      const next: Buckets = {}
      for (const [k, list] of Object.entries(prev)) {
        next[k] = list.filter((t) => t.id !== id)
      }
      const dueAt =
        toKey === UNSCHEDULED ? null : new Date(`${toKey}T09:00:00+03:00`)
      next[toKey] = [{ ...from.task, dueAt }, ...(next[toKey] ?? [])]
      return next
    })

    startTransition(async () => {
      const result = await updateTaskDue(id, {
        dueAt: toKey === UNSCHEDULED ? "" : toKey,
      })
      if (!result.ok) {
        if (snapshot.current) setBuckets(snapshot.current)
        toast.error(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-3">
        {columnKeys.map((key) => (
          <DayColumn
            key={key}
            columnKey={key}
            todayKey={todayKey}
            tasks={buckets[key] ?? []}
            canMove={canMove}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
        {activeTask ? (
          <div className="w-60">
            <AgendaCard task={activeTask} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function DayColumn({
  columnKey,
  todayKey,
  tasks,
  canMove,
  activeId,
}: {
  columnKey: string
  todayKey: string
  tasks: TaskRow[]
  canMove: boolean
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnKey,
    disabled: !canMove,
  })

  const isUnscheduled = columnKey === UNSCHEDULED
  const isToday = columnKey === todayKey
  const isPast = !isUnscheduled && columnKey < todayKey

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex shrink-0 flex-col rounded-xl border transition-colors sm:w-60",
        isOver && "border-brand bg-brand-muted/40",
        isToday && "border-brand/60"
      )}
    >
      <header className="flex items-baseline justify-between gap-2 border-b px-3 py-2">
        <div className="flex flex-col">
          <span
            className={cn(
              "text-sm font-semibold",
              isToday && "text-brand-foreground"
            )}
          >
            {isUnscheduled
              ? "Planlanmamış"
              : isToday
                ? "Bugün"
                : formatWeekday(`${columnKey}T12:00:00+03:00`)}
          </span>
          {!isUnscheduled ? (
            <span className="text-muted-foreground text-xs">
              {formatDayMonth(`${columnKey}T12:00:00+03:00`)}
            </span>
          ) : null}
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {tasks.length}
        </span>
      </header>

      <div className="flex min-h-16 flex-1 flex-col gap-2 p-2">
        {tasks.length === 0 ? (
          <p
            className={cn(
              "text-muted-foreground/70 px-1 py-4 text-center text-xs",
              isPast && "opacity-60"
            )}
          >
            —
          </p>
        ) : (
          tasks.map((task) => (
            <DraggableAgendaCard
              key={task.id}
              task={task}
              canMove={canMove}
              dragging={activeId === task.id}
            />
          ))
        )}
      </div>
    </section>
  )
}

function DraggableAgendaCard({
  task,
  canMove,
  dragging,
}: {
  task: TaskRow
  canMove: boolean
  dragging: boolean
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } =
    useDraggable({ id: task.id, disabled: !canMove })

  return (
    <div ref={setNodeRef}>
      <AgendaCard
        task={task}
        dragging={dragging}
        canMove={canMove}
        handleRef={canMove ? setActivatorNodeRef : undefined}
        handleProps={canMove ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  )
}

function AgendaCard({
  task,
  overlay,
  dragging,
  canMove,
  handleRef,
  handleProps,
}: {
  task: TaskRow
  overlay?: boolean
  dragging?: boolean
  canMove?: boolean
  handleRef?: (el: HTMLButtonElement | null) => void
  handleProps?: Record<string, unknown>
}) {
  const done = task.status === "DONE"
  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-1.5 rounded-lg p-2.5 text-sm ring-1 transition-shadow",
        overlay && "shadow-lg",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
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
            className="text-muted-foreground hover:text-foreground -mr-1 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
            {...handleProps}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {task.assignee ? <span>{task.assignee.name}</span> : null}
        <TaskPriorityBadge priority={task.priority} />
      </div>
      {task.opportunityId ? (
        <Link
          href={`/opportunities/${task.opportunityId}`}
          className="text-muted-foreground hover:text-foreground truncate text-xs hover:underline"
        >
          {task.opportunityTitle ?? task.companyName}
        </Link>
      ) : task.companyName ? (
        <span className="text-muted-foreground truncate text-xs">
          {task.companyName}
        </span>
      ) : null}
    </div>
  )
}
