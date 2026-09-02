import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta adresi gerekli.")
    .email("Geçerli bir e-posta adresi gir."),
  password: z.string().min(1, "Şifre gerekli."),
  remember: z.boolean().default(true),
})

export type LoginInput = z.infer<typeof loginSchema>
