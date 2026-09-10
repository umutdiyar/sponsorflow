import { z } from "zod"

import type { OrganizationRole } from "@/generated/prisma/enums"

/** Roles that can be handed out through the team UI (role change / new member). */
export const ASSIGNABLE_ROLES = [
  "ADMIN",
  "SPONSORSHIP_LEAD",
  "MEMBER",
  "VIEWER",
] as const satisfies readonly OrganizationRole[]

/** Minimum length for an admin-set temporary password. */
export const TEMP_PASSWORD_MIN = 12

const email = z
  .string()
  .trim()
  .min(1, "E-posta gerekli.")
  .email("Geçerli bir e-posta adresi gir.")
  .transform((v) => v.toLowerCase())

const tempPassword = z
  .string()
  .min(TEMP_PASSWORD_MIN, `Şifre en az ${TEMP_PASSWORD_MIN} karakter olmalı.`)
  .max(72, "Şifre çok uzun.")

/**
 * Direct account creation — an OWNER/ADMIN/LEAD provisions a Supabase Auth user
 * plus Profile + Membership in one go. No email is sent; the temporary password
 * is handed to the new member out of band.
 */
export const createMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Ad soyad gerekli.").max(120),
  email,
  role: z.enum(ASSIGNABLE_ROLES),
  password: tempPassword,
})
export type CreateMemberInput = z.input<typeof createMemberSchema>

/** Admin-triggered password reset for an existing member. */
export const resetMemberPasswordSchema = z.object({
  password: tempPassword,
})
export type ResetMemberPasswordInput = z.input<typeof resetMemberPasswordSchema>

export const roleChangeSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
})
export type RoleChangeInput = z.input<typeof roleChangeSchema>
