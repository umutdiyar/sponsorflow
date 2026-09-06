import { z } from "zod"

export const EXPORT_TYPES = ["companies", "contacts", "opportunities"] as const
export type ExportType = (typeof EXPORT_TYPES)[number]

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  companies: "Firmalar",
  contacts: "Kişiler",
  opportunities: "Fırsatlar",
}

export const EXPORT_FORMATS = ["csv", "xlsx"] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel (XLSX)",
}

export const exportRequestSchema = z.object({
  type: z.enum(EXPORT_TYPES),
  format: z.enum(EXPORT_FORMATS),
  filters: z
    .object({
      /** membership id, "unassigned", or "" for all */
      owner: z.string().max(64).optional(),
      industry: z.string().max(120).optional(),
      /** only companies in the current weekly focus */
      focusOnly: z.boolean().optional(),
      includeArchived: z.boolean().optional(),
    })
    .default({}),
})

export type ExportRequest = z.infer<typeof exportRequestSchema>

export type ExportResult =
  | { ok: true; fileName: string; mime: string; base64: string; rows: number }
  | { ok: false; error: string }
