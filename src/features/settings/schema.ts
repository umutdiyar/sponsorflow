import { z } from "zod"

export const PASSWORD_MIN = 10

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN, `Şifre en az ${PASSWORD_MIN} karakter olmalı.`)
      .max(72, "Şifre çok uzun."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirm"],
  })

export type ChangePasswordInput = z.input<typeof changePasswordSchema>
