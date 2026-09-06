"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDownIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toDateInputValue } from "@/lib/format"
import { createTask, updateTask } from "@/features/tasks/actions"
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  taskFormSchema,
  type TaskFormInput,
} from "@/features/tasks/schema"
import type { MemberRef, CompanyRef } from "@/lib/org/reference"
import type { OpportunityOption } from "@/features/opportunities/queries"

export type TaskFormTarget = {
  id: string
  title: string
  description: string | null
  assignedToMembershipId: string
  companyId: string | null
  opportunityId: string | null
  priority: (typeof TASK_PRIORITIES)[number]
  status: (typeof TASK_STATUSES)[number]
  dueAt: Date | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: MemberRef[]
  companies: CompanyRef[]
  opportunities: OpportunityOption[]
  task?: TaskFormTarget | null
  defaults?: {
    assignedToMembershipId?: string
    companyId?: string
    opportunityId?: string
  }
  onSaved?: (id: string) => void
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

function toDefaults(
  task: TaskFormTarget | null | undefined,
  d?: Props["defaults"]
): TaskFormInput {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    assignedToMembershipId:
      task?.assignedToMembershipId ?? d?.assignedToMembershipId ?? "",
    companyId: task?.companyId ?? d?.companyId ?? "",
    opportunityId: task?.opportunityId ?? d?.opportunityId ?? "",
    priority: task?.priority ?? "MEDIUM",
    status: task?.status ?? "TODO",
    dueAt: task?.dueAt ? toDateInputValue(task.dueAt) : "",
  }
}

export function TaskFormSheet({
  open,
  onOpenChange,
  members,
  companies,
  opportunities,
  task,
  defaults,
  onSaved,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showMore, setShowMore] = useState(false)
  const isEdit = Boolean(task)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskFormInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: toDefaults(task, defaults),
  })

  useEffect(() => {
    if (open) reset(toDefaults(task, defaults))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  // Expand "Diğer ayrıntılar" on open when those fields already carry values.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setShowMore(
        Boolean(
          task?.description ||
            task?.companyId ||
            task?.opportunityId ||
            (task && task.status !== "TODO") ||
            defaults?.companyId ||
            defaults?.opportunityId
        )
      )
    }
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedOpportunityId = watch("opportunityId")
  const opportunityCompany = useMemo(
    () =>
      opportunities.find((o) => o.id === selectedOpportunityId)?.companyId ??
      null,
    [opportunities, selectedOpportunityId]
  )

  // Keep the company in sync with the chosen opportunity.
  useEffect(() => {
    if (opportunityCompany) setValue("companyId", opportunityCompany)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityCompany])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateTask(task!.id, values)
        : await createTask(values)
      if (result.ok) {
        toast.success(isEdit ? "Görev güncellendi." : "Görev oluşturuldu.")
        onOpenChange(false)
        router.refresh()
        onSaved?.(result.id)
      } else {
        toast.error(result.error)
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Görevi düzenle" : "Görev ekle"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Görev bilgilerini güncelle."
              : "Takip edilecek bir sponsorluk aksiyonu oluştur."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <Field label="Başlık" required error={errors.title?.message}>
              <Input
                autoFocus
                aria-invalid={Boolean(errors.title)}
                {...register("title")}
              />
            </Field>

            <Field
              label="Sorumlu"
              required
              error={errors.assignedToMembershipId?.message}
            >
              <select
                className={selectClass}
                aria-invalid={Boolean(errors.assignedToMembershipId)}
                {...register("assignedToMembershipId")}
              >
                <option value="">Seç…</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Son Tarih" error={errors.dueAt?.message}>
                <Input type="date" {...register("dueAt")} />
              </Field>
              <Field label="Öncelik">
                <select className={selectClass} {...register("priority")}>
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs font-medium"
            >
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform",
                  showMore && "rotate-180"
                )}
              />
              Diğer ayrıntılar
            </button>

            {showMore ? (
              <div className="space-y-4">
                <Field label="Fırsat">
                  <select
                    className={selectClass}
                    {...register("opportunityId")}
                  >
                    <option value="">Fırsata bağlı değil</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.companyName} — {o.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Firma">
                  <select
                    className={selectClass}
                    disabled={Boolean(opportunityCompany)}
                    {...register("companyId")}
                  >
                    <option value="">Firmaya bağlı değil</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Açıklama" error={errors.description?.message}>
                  <Textarea rows={3} {...register("description")} />
                </Field>

                <Field label="Durum">
                  <select className={selectClass} {...register("status")}>
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <SheetClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Vazgeç
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Kaydediliyor…
                </>
              ) : isEdit ? (
                "Kaydet"
              ) : (
                "Görev Ekle"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </label>
  )
}
