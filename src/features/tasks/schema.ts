import { z } from "zod"

import type { TaskPriority, TaskStatus } from "@/generated/prisma/enums"

export const TASK_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const satisfies readonly TaskPriority[]

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
] as const satisfies readonly TaskStatus[]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  DONE: "Tamamlandı",
  CANCELLED: "İptal edildi",
}

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Geçerli bir tarih seç."
  )

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Başlık gerekli.")
    .max(200, "Başlık çok uzun."),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  assignedToMembershipId: z.string().min(1, "Sorumlu seç."),
  companyId: optionalId,
  opportunityId: optionalId,
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  dueAt: optionalDate,
})

export type TaskFormInput = z.input<typeof taskFormSchema>
export type TaskFormValues = z.output<typeof taskFormSchema>

export const taskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
})
export type TaskStatusInput = z.input<typeof taskStatusSchema>

export const taskDueSchema = z.object({ dueAt: optionalDate })
export type TaskDueInput = z.input<typeof taskDueSchema>
