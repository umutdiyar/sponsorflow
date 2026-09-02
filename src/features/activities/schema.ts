import { z } from "zod"

import type { ActivityType } from "@/generated/prisma/enums"

export const ACTIVITY_TYPES = [
  "EMAIL",
  "PHONE",
  "MEETING",
  "LINKEDIN",
  "WHATSAPP",
  "NOTE",
  "PROPOSAL",
  "FOLLOW_UP",
  "STAGE_CHANGE",
] as const satisfies readonly ActivityType[]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  EMAIL: "E-posta",
  PHONE: "Telefon görüşmesi",
  MEETING: "Toplantı",
  LINKEDIN: "LinkedIn",
  WHATSAPP: "WhatsApp",
  NOTE: "Not",
  PROPOSAL: "Teklif",
  FOLLOW_UP: "Takip",
  STAGE_CHANGE: "Aşama değişikliği",
}

/** Types a user may pick when logging an activity by hand. */
export const LOGGABLE_ACTIVITY_TYPES = ACTIVITY_TYPES.filter(
  (t): t is Exclude<ActivityType, "STAGE_CHANGE"> => t !== "STAGE_CHANGE"
)

export const activityFormSchema = z
  .object({
    type: z.enum(LOGGABLE_ACTIVITY_TYPES),
    companyId: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),
    opportunityId: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),
    contactId: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),
    title: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    description: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .transform((v) => (v ? v : undefined)),
    // <input type="datetime-local"> value, interpreted as Europe/Istanbul.
    occurredAt: z.string().trim().min(1, "Tarih gerekli."),
  })
  .refine((v) => v.companyId || v.opportunityId, {
    message: "Firma veya fırsat gerekli.",
    path: ["companyId"],
  })

export type ActivityFormInput = z.input<typeof activityFormSchema>
export type ActivityFormValues = z.output<typeof activityFormSchema>
