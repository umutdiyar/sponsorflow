"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { formatMoneyCompact } from "@/lib/format"
import { changeOpportunityStage } from "@/features/opportunities/actions"
import { PipelineCard } from "@/features/opportunities/components/pipeline-card"
import { LostReasonDialog } from "@/features/opportunities/components/lost-reason-dialog"
import type { OpportunityRow } from "@/features/opportunities/queries"
import type { StageRef } from "@/lib/org/reference"

type Props = {
  stages: StageRef[]
  opportunities: OpportunityRow[]
  canMove: boolean
}

type Columns = Record<string, OpportunityRow[]>

function groupByStage(
  stages: StageRef[],
  opportunities: OpportunityRow[]
): Columns {
  const cols: Columns = {}
  for (const s of stages) cols[s.id] = []
  for (const o of opportunities) {
    ;(cols[o.stage.id] ??= []).push(o)
  }
  return cols
}

export function PipelineBoard({ stages, opportunities, canMove }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const signature = useMemo(
    () =>
      opportunities
        .map((o) => `${o.id}:${o.stage.id}:${o.updatedAt.getTime()}`)
        .join("|"),
    [opportunities]
  )
  const [columns, setColumns] = useState<Columns>(() =>
    groupByStage(stages, opportunities)
  )
  // Rebuild columns when the server sends a new set of opportunities.
  const [prevSignature, setPrevSignature] = useState(signature)
  if (signature !== prevSignature) {
    setPrevSignature(signature)
    setColumns(groupByStage(stages, opportunities))
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  const [lostTarget, setLostTarget] = useState<{
    id: string
    stageId: string
  } | null>(null)
  const snapshot = useRef<Columns | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor)
  )

  const byId = useMemo(() => {
    const m = new Map<string, { opp: OpportunityRow; stageId: string }>()
    for (const [stageId, list] of Object.entries(columns)) {
      for (const opp of list) m.set(opp.id, { opp, stageId })
    }
    return m
  }, [columns])

  const activeOpp = activeId ? (byId.get(activeId)?.opp ?? null) : null

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id)
    setActiveId(null)

    const over = event.over
    if (!over) return

    const from = byId.get(id)
    if (!from) return
    const toStageId = String(over.id)
    if (!columns[toStageId] || toStageId === from.stageId) return

    const targetStage = stages.find((s) => s.id === toStageId)
    if (!targetStage) return

    // Optimistic move.
    snapshot.current = columns
    setColumns((prev) => {
      const next: Columns = {}
      for (const [sid, list] of Object.entries(prev)) {
        next[sid] = list.filter((o) => o.id !== id)
      }
      const moved: OpportunityRow = {
        ...from.opp,
        stage: {
          id: targetStage.id,
          name: targetStage.name,
          key: targetStage.key,
          type: targetStage.type,
        },
      }
      next[toStageId] = [moved, ...(next[toStageId] ?? [])]
      return next
    })

    startTransition(async () => {
      const result = await changeOpportunityStage(id, { stageId: toStageId })
      if (!result.ok) {
        if (snapshot.current) setColumns(snapshot.current)
        toast.error(result.error)
        return
      }
      toast.success(`"${from.opp.title}" → ${targetStage.name}`)
      if (targetStage.type === "LOST") {
        setLostTarget({ id, stageId: toStageId })
      }
      router.refresh()
    })
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              items={columns[stage.id] ?? []}
              canMove={canMove}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeOpp ? (
            <div className="w-72">
              <PipelineCard opportunity={activeOpp} overlay canMove={canMove} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LostReasonDialog
        target={lostTarget}
        onOpenChange={(open) => {
          if (!open) setLostTarget(null)
        }}
        onSaved={() => {
          setLostTarget(null)
          router.refresh()
        }}
      />
    </>
  )
}

function Column({
  stage,
  items,
  canMove,
  activeId,
}: {
  stage: StageRef
  items: OpportunityRow[]
  canMove: boolean
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    disabled: !canMove,
  })

  const value = items.reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0)

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex w-72 shrink-0 snap-start flex-col rounded-xl border transition-colors",
        isOver && "border-brand bg-brand-muted/40"
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{stage.name}</span>
          <span className="bg-background text-muted-foreground rounded-full px-1.5 text-xs font-medium tabular-nums">
            {items.length}
          </span>
        </div>
        {value > 0 ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            {formatMoneyCompact(value, items[0]?.currency ?? "TRY")}
          </span>
        ) : null}
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground/70 px-1 py-6 text-center text-xs">
            Bu aşamada fırsat yok
          </p>
        ) : (
          items.map((opp) => (
            <DraggableCard
              key={opp.id}
              opp={opp}
              canMove={canMove}
              dragging={activeId === opp.id}
            />
          ))
        )}
      </div>
    </section>
  )
}

function DraggableCard({
  opp,
  canMove,
  dragging,
}: {
  opp: OpportunityRow
  canMove: boolean
  dragging: boolean
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } =
    useDraggable({ id: opp.id, disabled: !canMove })

  return (
    <div ref={setNodeRef}>
      <PipelineCard
        opportunity={opp}
        canMove={canMove}
        dragging={dragging}
        handleRef={canMove ? setActivatorNodeRef : undefined}
        handleProps={
          canMove ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  )
}
