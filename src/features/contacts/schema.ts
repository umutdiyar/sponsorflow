import { z } from "zod"

const optional = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined))

const emailOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    "Geçerli bir e-posta adresi gir."
  )

const urlOptional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^https?:\/\/.+/i.test(v),
    "Geçerli bir bağlantı gir (https:// ile başlamalı)."
  )

export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "Ad gerekli.").max(120),
  lastName: z.string().trim().min(1, "Soyad gerekli.").max(120),
  jobTitle: optional,
  department: optional,
  email: emailOptional,
  phone: optional,
  linkedinUrl: urlOptional,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  isPrimary: z.boolean().default(false),
})

export type ContactFormInput = z.input<typeof contactFormSchema>
export type ContactFormValues = z.output<typeof contactFormSchema>
