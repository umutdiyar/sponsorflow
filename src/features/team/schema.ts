import { z } from "zod"

import type { OrganizationRole } from "@/generated/prisma/enums"

/** Roles that can be handed out through the invite / role-change UI. */
export const ASSIGNABLE_ROLES = [
  "ADMIN",
  "SPONSORSHIP_LEAD",
  "MEMBER",
  "VIEWER",
] as const satisfies readonly OrganizationRole[]

export const inviteMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined)),
  email: z
    .string()
    .trim()
    .min(1, "E-posta gerekli.")
    .email("Geçerli bir e-posta adresi gir.")
    .transform((v) => v.toLowerCase()),
  role: z.enum(ASSIGNABLE_ROLES),
})

export type InviteMemberInput = z.input<typeof inviteMemberSchema>

export const roleChangeSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
})
export type RoleChangeInput = z.input<typeof roleChangeSchema>
