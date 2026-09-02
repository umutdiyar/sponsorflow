import "server-only"

import { cache } from "react"

import { prisma } from "@/lib/db/prisma"
import { requireUser, type SessionUser } from "@/lib/auth/dal"
import {
  hasPermission,
  ORGANIZATION_ROLE_LABELS,
  type Permission,
} from "@/lib/auth/permissions"
import type { OrganizationRole } from "@/generated/prisma/enums"

export class ForbiddenError extends Error {
  constructor(message = "Bu işlem için yetkin yok.") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export type CurrentMembership = {
  membershipId: string
  profileId: string
  organizationId: string
  role: OrganizationRole
  roleLabel: string
  organization: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
  }
}

/**
 * First-time provisioning: create the Profile row and join the user to the
 * single active organization (first member → OWNER, later → MEMBER). Runs at
 * most once per user, ever — steady-state requests take the read-only path in
 * `getCurrentMembership()`.
 */
async function provisionMembership(user: SessionUser) {
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  if (!org) {
    throw new Error(
      "Aktif organizasyon bulunamadı. `pnpm db:seed` çalıştırılmalı."
    )
  }

  await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      fullName: user.name,
      avatarUrl: user.avatarUrl,
    },
    update: {},
  })

  const memberCount = await prisma.organizationMembership.count({
    where: { organizationId: org.id },
  })

  return prisma.organizationMembership.create({
    data: {
      organizationId: org.id,
      profileId: user.id,
      role: memberCount === 0 ? "OWNER" : "MEMBER",
    },
    include: { organization: true },
  })
}

/**
 * The current user's membership in the active organization.
 *
 * Steady state = a single indexed read. `cache()` dedupes it across the layout
 * and page within one render pass. Redirects to `/login` when unauthenticated.
 */
export const getCurrentMembership = cache(
  async (): Promise<CurrentMembership> => {
    const user = await requireUser()

    const membership =
      (await prisma.organizationMembership.findFirst({
        where: { profileId: user.id },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      })) ?? (await provisionMembership(user))

    return {
      membershipId: membership.id,
      profileId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      roleLabel: ORGANIZATION_ROLE_LABELS[membership.role],
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logoUrl: membership.organization.logoUrl,
      },
    }
  }
)

export const requireMembership = getCurrentMembership

/**
 * Server-side permission gate. Never rely on the client for this.
 */
export async function requirePermission(
  permission: Permission
): Promise<CurrentMembership> {
  const membership = await getCurrentMembership()
  if (!hasPermission(membership.role, permission)) {
    throw new ForbiddenError()
  }
  return membership
}
