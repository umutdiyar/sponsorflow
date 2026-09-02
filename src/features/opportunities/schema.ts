import { z } from "zod"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

/** "" | "12.500" | 12500 | missing → number | undefined (whole, non-negative). */
const optionalAmount = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined
    const raw = typeof v === "number" ? v : v.replace(/[.\s]/g, "").trim()
    if (raw === "") return undefined
    const n = typeof raw === "number" ? raw : Number(raw)
    return Number.isFinite(n) ? Math.trunc(Math.abs(n)) : undefined
  })

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Geçerli bir tarih seç."
  )

export const opportunityFormSchema = z.object({
  companyId: z.string().min(1, "Firma seç."),
  title: z
    .string()
    .trim()
    .min(1, "Başlık gerekli.")
    .max(200, "Başlık çok uzun."),
  ownerMembershipId: z.string().min(1, "Sorumlu seç."),
  stageId: z.string().min(1, "Aşama seç."),
  packageId: optionalId,
  estimatedValue: optionalAmount,
  probability: optionalAmount.refine(
    (v) => v === undefined || v <= 100,
    "Olasılık 0–100 arasında olmalı."
  ),
  nextAction: optionalText(300),
  nextActionAt: optionalDate,
  expectedCloseDate: optionalDate,
})

export type OpportunityFormInput = z.input<typeof opportunityFormSchema>
export type OpportunityFormValues = z.output<typeof opportunityFormSchema>

export const stageChangeSchema = z.object({
  stageId: z.string().min(1, "Aşama seç."),
  lostReason: optionalText(500),
})

export type StageChangeInput = z.input<typeof stageChangeSchema>

export const nextActionSchema = z.object({
  nextAction: optionalText(300),
  nextActionAt: optionalDate,
})

export type NextActionInput = z.input<typeof nextActionSchema>
