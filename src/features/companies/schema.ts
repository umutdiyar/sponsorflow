import { z } from "zod"

/** Suggested industries (free text is still allowed on write). */
export const INDUSTRY_OPTIONS = [
  "Teknoloji & Yazılım",
  "Bulut & Altyapı",
  "Yapay Zeka",
  "Siber Güvenlik",
  "Finans & Bankacılık",
  "E-ticaret",
  "Telekomünikasyon",
  "Danışmanlık",
  "Eğitim",
  "Oyun",
  "Sağlık Teknolojileri",
  "Medya & Reklam",
  "Perakende",
  "Enerji",
  "Diğer",
] as const

export const SOURCE_OPTIONS = [
  "LinkedIn",
  "Referans",
  "Etkinlik",
  "Web sitesi",
  "Soğuk iletişim",
  "Ekip önerisi",
  "Diğer",
] as const

const trimmedOptional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined))

const urlOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^https?:\/\/.+/i.test(v),
    "Geçerli bir bağlantı gir (https:// ile başlamalı)."
  )

export const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Firma adı gerekli.")
    .max(200, "Firma adı çok uzun."),
  website: urlOptional,
  industry: trimmedOptional,
  linkedinUrl: urlOptional,
  city: trimmedOptional,
  country: trimmedOptional,
  source: trimmedOptional,
  ownerMembershipId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
})

export type CompanyFormInput = z.input<typeof companyFormSchema>
export type CompanyFormValues = z.output<typeof companyFormSchema>
