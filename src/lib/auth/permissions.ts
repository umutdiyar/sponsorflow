import type { OrganizationRole } from "@/generated/prisma/enums"

/**
 * Central permission catalogue. UI may use these to hide/disable affordances,
 * but every mutation and read on the server MUST re-check with
 * `requirePermission()` — client checks are UX only, never a security boundary.
 */
export const PERMISSIONS = [
  "organization:read",
  "organization:update",

  "member:read",
  "member:invite",
  "member:update",

  "company:read",
  "company:create",
  "company:update",
  "company:archive",

  "contact:read",
  "contact:create",
  "contact:update",
  "contact:archive",

  "pipeline:read",
  "pipeline:update",

  "package:read",

  "data:import",
  "data:export",

  "settings:manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const READ_ONLY: Permission[] = [
  "organization:read",
  "member:read",
  "company:read",
  "contact:read",
  "pipeline:read",
  "package:read",
]

const MEMBER: Permission[] = [
  ...READ_ONLY,
  "company:create",
  "company:update",
  "contact:create",
  "contact:update",
  "data:export",
]

const SPONSORSHIP_LEAD: Permission[] = [
  ...MEMBER,
  "company:archive",
  "contact:archive",
  "pipeline:update",
  "member:invite",
  "data:import",
]

const ADMIN: Permission[] = [
  ...SPONSORSHIP_LEAD,
  "organization:update",
  "member:update",
  "settings:manage",
]

const OWNER: Permission[] = [...ADMIN]

const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  VIEWER: READ_ONLY,
  MEMBER,
  SPONSORSHIP_LEAD,
  ADMIN,
  OWNER,
}

export function permissionsForRole(role: OrganizationRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

export function hasPermission(
  role: OrganizationRole,
  permission: Permission
): boolean {
  return permissionsForRole(role).includes(permission)
}

/** Turkish labels for organization roles (UI display). */
export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Organizasyon Sahibi",
  ADMIN: "Yönetici",
  SPONSORSHIP_LEAD: "Sponsorluk Lideri",
  MEMBER: "Sponsorluk Ekibi",
  VIEWER: "Görüntüleyici",
}
