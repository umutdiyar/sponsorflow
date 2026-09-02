import { CheckSquareIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Panel, PanelHeader } from "@/components/common/panel"
import { EmptyState } from "@/components/common/empty-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { TaskPriority, TodayTask } from "@/features/dashboard/types"

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  normal: "Bugün",
  high: "Öncelikli",
  overdue: "Gecikmiş",
}

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  normal: "bg-muted text-muted-foreground",
  high: "bg-brand-muted text-brand-foreground",
  overdue: "bg-destructive/10 text-destructive",
}

type ActionCenterProps = {
  tasks: TodayTask[]
}

export function ActionCenter({ tasks }: ActionCenterProps) {
  return (
    <Panel>
      <PanelHeader
        title="Bugün Yapılacaklar"
        description="Sana ve ekibe atanmış açık aksiyonlar"
        action={{ label: "Tüm görevler", href: "/tasks" }}
      />
      {tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={CheckSquareIcon}
            title="Bugün için görev yok"
            description="Açık bir aksiyon oluşturduğunda burada görünecek."
          />
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{task.action}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {task.company}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                  <Avatar size="sm" className="size-5">
                    <AvatarFallback className="text-[0.625rem]">
                      {task.owner.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {task.owner}
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium",
                    PRIORITY_CLASS[task.priority]
                  )}
                >
                  {task.priority === "overdue"
                    ? task.due
                    : PRIORITY_LABEL[task.priority]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
