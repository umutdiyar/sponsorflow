import { z } from "zod"

/**
 * The wizard maps the file's columns to our fields on the client, then sends
 * plain string cells here. The server re-validates, dedupes and writes.
 */

const cell = z
  .string()
  .max(2000)
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))

export const importRowSchema = z.object({
  name: cell,
  industry: cell,
  website: cell,
  linkedinUrl: cell,
  city: cell,
  country: cell,
  source: cell,
  ownerName: cell,
  contactFirstName: cell,
  contactLastName: cell,
  contactEmail: cell,
  contactLinkedinUrl: cell,
})

export type ImportRow = z.infer<typeof importRowSchema>

export const DUPLICATE_STRATEGIES = ["skip", "update", "create"] as const
export type DuplicateStrategy = (typeof DUPLICATE_STRATEGIES)[number]

export const DUPLICATE_STRATEGY_LABELS: Record<DuplicateStrategy, string> = {
  skip: "Atla",
  update: "Mevcudu güncelle",
  create: "Yeni oluştur",
}

export const importRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  duplicateStrategy: z.enum(DUPLICATE_STRATEGIES),
  rows: z.array(importRowSchema).min(1).max(2000),
})

export type ImportRequest = z.infer<typeof importRequestSchema>

export type RowStatus = "valid" | "missing" | "duplicate" | "error"

export const ROW_STATUS_LABELS: Record<RowStatus, string> = {
  valid: "Geçerli",
  missing: "Eksik",
  duplicate: "Duplicate olabilir",
  error: "Hatalı",
}

export type AnalyzedRow = {
  index: number
  name: string | null
  status: RowStatus
  message: string | null
  /** id of the existing company this row matches, when status is "duplicate". */
  matchCompanyId: string | null
  matchName: string | null
  ownerResolved: string | null
}

export type ImportAnalysis = {
  rows: AnalyzedRow[]
  counts: Record<RowStatus, number>
  unknownOwners: string[]
}

export type ImportOutcome = {
  importId: string
  totalRows: number
  importedRows: number
  updatedRows: number
  skippedRows: number
  failedRows: number
}
