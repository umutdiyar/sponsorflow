"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/common/empty-state"
import { CheckSquareIcon } from "lucide-react"
import { describeDue, formatDate } from "@/lib/format"
import { archiveTask, updateTaskStatus } from "@/features/tasks/actions"
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/features/tasks/schema"
import { TaskPriorityBadge } from "@/features/tasks/components/task-priority-badge"
import {
  TaskFormSheet,
  type TaskFormTarget,
} from "@/features/tasks/components/task-form-sheet"
import { AgendaBoard } from "@/features/tasks/components/agenda-board"
import type { TaskRow, TaskScope } from "@/features/tasks/queries"
import type { CompanyRef, MemberRef } from "@/lib/org/reference"
import type { OpportunityOption } from "@/features/opportunities/queries"

const DUE_TONE: Record<string, string> = {
  overdue: "text-destructive",
  today: "text-warning-foreground",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
}

type Filters = {
  view: "liste" | "plan"
  scope: TaskScope
  status: string
  priority: string
  q: string
}

type Props = {
  tasks: TaskRow[]
  members: MemberRef[]
  companies: CompanyRef[]
  opportunities: OpportunityOption[]
  filters: Filters
  canCreate: boolean
  canUpdate: boolean
  canArchive: boolean
}

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"

export function TasksView({
  tasks,
  members,
  companies,
  opportunities,
  filters,
  canCreate,
  canUpdate,
  canArchive,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TaskFormTarget | null>(null)

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(
        () => setParam("q", value.trim()),
        300
      )
    },
    [setParam]
  )

  function toggleDone(task: TaskRow) {
    const done = task.status !== "DONE"
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, {
        status: done ? "DONE" : "TODO",
      })
      if (result.ok) router.refresh()
      else toast.error(result.error)
    })
  }

  function onArchive(task: TaskRow) {
    startTransition(async () => {
      const result = await archiveTask(task.id)
      if (result.ok) {
        toast.success("Görev arşivlendi.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const isPlan = filters.view === "plan"

  return (
    <div className="flex flex-col gap-4">
      {/* View switch + create */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted inline-flex rounded-lg p-0.5">
          {(["liste", "plan"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setParam("view", v === "liste" ? "" : v)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                filters.view === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "liste" ? "Liste" : "Plan"}
            </button>
          ))}
        </div>

        <div className="bg-muted inline-flex rounded-lg p-0.5">
          {(["mine", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setParam("scope", s === "mine" ? "" : s)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                filters.scope === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "mine" ? "Bana Atanan" : "Tümü"}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Görev Ekle
            </Button>
          ) : null}
        </div>
      </div>

      {/* Filters (list only) */}
      {!isPlan ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              defaultValue={filters.q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Görev, firma veya fırsat ara…"
              className="pl-8"
              aria-label="Görev ara"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setParam("status", e.target.value)}
            aria-label="Duruma göre filtrele"
            className={selectClass}
          >
            <option value="">Tüm durumlar</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setParam("priority", e.target.value)}
            aria-label="Önceliğe göre filtrele"
            className={selectClass}
          >
            <option value="">Tüm öncelikler</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Body */}
      {isPlan ? (
        <>
          <p className="text-muted-foreground text-xs">
            Kartları günler arasında sürükleyerek son tarihini değiştir. Tarih,
            görev formundan da güncellenebilir.
          </p>
          <AgendaBoard tasks={tasks} canMove={canUpdate} />
        </>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquareIcon}
          title="Görev yok."
          description="Bir sponsorluk aksiyonu oluşturduğunda burada listelenecek."
          action={
            canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                Görev Ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-200 border-collapse text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2 font-medium">Görev</th>
                <th className="px-3 py-2 font-medium">Firma / Fırsat</th>
                <th className="px-3 py-2 font-medium">Sorumlu</th>
                <th className="px-3 py-2 font-medium">Öncelik</th>
                <th className="px-3 py-2 font-medium">Son Tarih</th>
                <th className="px-3 py-2 font-medium">Durum</th>
                <th className="w-8 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {tasks.map((task) => {
                const due = describeDue(task.dueAt)
                const done = task.status === "DONE"
                return (
                  <tr key={task.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        aria-label="Tamamlandı"
                        onClick={() => canUpdate && toggleDone(task)}
                        disabled={!canUpdate}
                        className={cn(
                          "flex size-4 items-center justify-center rounded border transition-colors",
                          done
                            ? "border-success bg-success text-success-foreground"
                            : "border-input hover:border-foreground",
                          !canUpdate && "cursor-default opacity-60"
                        )}
                      >
                        {done ? <CheckIcon className="size-3" /> : null}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "font-medium",
                          done && "text-muted-foreground line-through"
                        )}
                      >
                        {task.title}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                      {task.opportunityId ? (
                        <Link
                          href={`/opportunities/${task.opportunityId}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {task.opportunityTitle}
                        </Link>
                      ) : task.companyName ? (
                        <Link
                          href={`/companies/${task.companyId}`}
                          className="hover:text-foreground hover:underline"
                        >
                          {task.companyName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                      {task.assignee?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <TaskPriorityBadge priority={task.priority} />
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 whitespace-nowrap",
                        DUE_TONE[due.tone]
                      )}
                    >
                      {task.dueAt ? formatDate(task.dueAt) : "—"}
                      {task.dueAt && due.tone === "overdue" ? (
                        <span className="ml-1 text-xs">({due.label})</span>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                      {TASK_STATUS_LABELS[task.status]}
                    </td>
                    <td className="px-3 py-2.5">
                      {canUpdate || canArchive ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label="İşlemler"
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {canUpdate ? (
                              <DropdownMenuItem
                                onSelect={() =>
                                  setEditTarget(toFormTarget(task))
                                }
                              >
                                <PencilIcon />
                                Düzenle
                              </DropdownMenuItem>
                            ) : null}
                            {canArchive ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => onArchive(task)}
                                >
                                  <ArchiveIcon />
                                  Arşivle
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isPlan ? (
        <p className="text-muted-foreground text-xs">{tasks.length} görev</p>
      ) : null}

      <TaskFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        companies={companies}
        opportunities={opportunities}
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
      />
    </div>
  )
}

function toFormTarget(task: TaskRow): TaskFormTarget {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignedToMembershipId: task.assignedToMembershipId,
    companyId: task.companyId,
    opportunityId: task.opportunityId,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt,
  }
}
