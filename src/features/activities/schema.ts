import { z } from "zod"

import type {
  ActivityChannel,
  ActivityDirection,
  ActivityKind,
} from "@/generated/prisma/enums"

/**
 * Communications are described on three independent axes:
 *  - channel   → the medium (E-posta, LinkedIn, WhatsApp, Telefon, Toplantı…)
 *  - direction → who reached out (Giden / Gelen / İç)
 *  - kind      → the intent (İlk temas, Takip, Gelen yanıt, Teklif, Not…)
 * The legacy `Activity.type` column is derived from these on write.
 */

export const ACTIVITY_CHANNELS = [
  "EMAIL",
  "LINKEDIN",
  "WHATSAPP",
  "PHONE",
  "MEETING",
  "OTHER",
  "INTERNAL",
] as const satisfies readonly ActivityChannel[]

export const ACTIVITY_KINDS = [
  "INITIAL_CONTACT",
  "FOLLOW_UP",
  "RESPONSE",
  "PROPOSAL",
  "MEETING_NOTE",
  "NOTE",
  "STAGE_CHANGE",
] as const satisfies readonly ActivityKind[]

export const ACTIVITY_DIRECTIONS = [
  "OUTBOUND",
  "INBOUND",
  "INTERNAL",
] as const satisfies readonly ActivityDirection[]

export const ACTIVITY_CHANNEL_LABELS: Record<ActivityChannel, string> = {
  EMAIL: "E-posta",
  LINKEDIN: "LinkedIn",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefon",
  MEETING: "Toplantı",
  OTHER: "Diğer",
  INTERNAL: "İç not",
}

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  INITIAL_CONTACT: "İlk temas",
  FOLLOW_UP: "Takip",
  RESPONSE: "Gelen yanıt",
  PROPOSAL: "Teklif",
  MEETING_NOTE: "Toplantı notu",
  NOTE: "Not",
  STAGE_CHANGE: "Aşama değişikliği",
}

export const ACTIVITY_DIRECTION_LABELS: Record<ActivityDirection, string> = {
  OUTBOUND: "Giden",
  INBOUND: "Gelen",
  INTERNAL: "İç",
}

/** Kinds a user may pick by hand (STAGE_CHANGE is system-generated). */
export const LOGGABLE_KINDS = ACTIVITY_KINDS.filter(
  (k): k is Exclude<ActivityKind, "STAGE_CHANGE"> => k !== "STAGE_CHANGE"
)

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

export const communicationFormSchema = z
  .object({
    channel: z.enum(ACTIVITY_CHANNELS),
    direction: z.enum(ACTIVITY_DIRECTIONS),
    kind: z.enum(LOGGABLE_KINDS),
    companyId: optionalId,
    opportunityId: optionalId,
    contactId: optionalId,
    title: optionalText(200),
    description: optionalText(4000),
    // <input type="datetime-local"> value, interpreted as Europe/Istanbul.
    occurredAt: z.string().trim().min(1, "Tarih gerekli."),
  })
  .refine((v) => v.companyId || v.opportunityId, {
    message: "Firma veya fırsat gerekli.",
    path: ["companyId"],
  })

export type CommunicationFormInput = z.input<typeof communicationFormSchema>
export type CommunicationFormValues = z.output<typeof communicationFormSchema>
