"use client"

import { useTransition } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { describeDue } from "@/lib/format"
import { updateTaskStatus } from "@/features/tasks/actions"
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge"
import type { TaskRow } from "@/features/tasks/queries"

const DUE_TONE: Record<string, string> = {
  overdue: "text-destructive",
  today: "text-warning-foreground",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
}

type Props = {
  tasks: TaskRow[]
  canUpdate: boolean
  onChanged?: (id: string, done: boolean) => void
}

export function TaskMiniList({ tasks, canUpdate, onChanged }: Props) {
  const [isPending, startTransition] = useTransition()

  function toggle(task: TaskRow) {
    if (!canUpdate) return
    const done = task.status !== "DONE"
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, {
        status: done ? "DONE" : "TODO",
      })
      if (result.ok) {
        onChanged?.(task.id, done)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <ul className="divide-border divide-y">
      {tasks.map((task) => {
        const done = task.status === "DONE"
        const due = describeDue(task.dueAt)
        return (
          <li key={task.id} className="flex items-start gap-2.5 py-2.5">
            <button
              type="button"
              aria-label={done ? "Tamamlandı olarak işaretle" : "Aç"}
              onClick={() => toggle(task)}
              disabled={!canUpdate || isPending}
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                done
                  ? "border-success bg-success text-success-foreground"
                  : "border-input hover:border-foreground",
                !canUpdate && "cursor-default opacity-60"
              )}
            >
              {done ? <CheckIcon className="size-3" /> : null}
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm",
                  done && "text-muted-foreground line-through"
                )}
              >
                {task.title}
              </span>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {task.assignee ? <span>{task.assignee.name}</span> : null}
                {task.dueAt ? (
                  <span className={DUE_TONE[due.tone]}>{due.label}</span>
                ) : null}
                <TaskPriorityBadge priority={task.priority} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
