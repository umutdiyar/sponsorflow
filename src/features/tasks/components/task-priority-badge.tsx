import { cn } from "@/lib/utils"
import type { TaskPriority } from "@/generated/prisma/enums"
import { TASK_PRIORITY_LABELS } from "@/features/tasks/schema"

const CLASS: Record<TaskPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-info/10 text-info",
  HIGH: "bg-warning/15 text-warning-foreground",
  URGENT: "bg-destructive/10 text-destructive",
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        CLASS[priority],
        className
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}
