import { z } from "zod"

export const CURRENCY_OPTIONS = ["TRY", "USD", "EUR"] as const

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

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

export const packageFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Paket adı gerekli.")
    .max(120, "Paket adı çok uzun."),
  description: optionalText(600),
  price: optionalAmount,
  currency: z
    .string()
    .trim()
    .min(1)
    .max(8)
    .default("TRY")
    .transform((v) => v.toUpperCase()),
  benefits: z
    .array(z.string().trim().min(1).max(200))
    .max(40, "En fazla 40 avantaj eklenebilir.")
    .default([]),
  isActive: z.boolean().default(true),
})

export type PackageFormInput = z.input<typeof packageFormSchema>
export type PackageFormValues = z.output<typeof packageFormSchema>
