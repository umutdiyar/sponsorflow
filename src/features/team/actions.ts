"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { canGrantRole, canManageMember } from "@/lib/auth/permissions"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  createMemberSchema,
  resetMemberPasswordSchema,
  roleChangeSchema,
  type CreateMemberInput,
  type ResetMemberPasswordInput,
  type RoleChangeInput,
} from "@/features/team/schema"

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

export type CreateMemberResult =
  | {
      ok: true
      member: { membershipId: string; name: string; email: string }
    }
  | { ok: false; error: string }

export type TeamActionResult = { ok: true } | { ok: false; error: string }

function isDuplicateAuthUser(message: string | undefined, code?: string) {
  const m = `${message ?? ""} ${code ?? ""}`.toLowerCase()
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("email_exists") ||
    m.includes("user already exists") ||
    code === "email_exists"
  )
}

/**
 * Provision a team member directly: a Supabase Auth user (email confirmed, no
 * mail sent) plus a Profile + OrganizationMembership. The temporary password is
 * supplied by the caller and is **never** persisted, logged or echoed back.
 *
 * Supabase Auth and Prisma cannot share a transaction, so on a Prisma failure we
 * compensate by deleting the just-created Auth user.
 */
export async function createMember(
  input: CreateMemberInput
): Promise<CreateMemberResult> {
  const parsed = createMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const actor = await requirePermission("invitation:create")
    const { fullName, email, role, password } = parsed.data

    if (!canGrantRole(actor.role, role)) {
      return { ok: false, error: "Bu rolü atama yetkin yok." }
    }

    // Duplicate checks — same email already in this org, or any existing account.
    const existingMember = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: actor.organizationId,
        deactivatedAt: null,
        profile: { email },
      },
      select: { id: true },
    })
    if (existingMember) {
      return { ok: false, error: "Bu e-posta zaten ekip üyesi." }
    }

    const existingProfile = await prisma.profile.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingProfile) {
      return {
        ok: false,
        error: "Bu e-posta ile zaten bir hesap bulunuyor.",
      }
    }

    const admin = getSupabaseAdmin()
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (created.error || !created.data.user) {
      if (isDuplicateAuthUser(created.error?.message, created.error?.code)) {
        return {
          ok: false,
          error: "Bu e-posta ile zaten bir hesap bulunuyor.",
        }
      }
      console.error("createMember: supabase createUser failed", {
        code: created.error?.code,
        message: created.error?.message,
      })
      return { ok: false, error: GENERIC }
    }

    const authUserId = created.data.user.id

    try {
      const membership = await prisma.$transaction(async (tx) => {
        await tx.profile.upsert({
          where: { id: authUserId },
          create: { id: authUserId, email, fullName },
          update: { email, fullName },
        })
        return tx.organizationMembership.create({
          data: {
            organizationId: actor.organizationId,
            profileId: authUserId,
            role,
          },
          select: { id: true },
        })
      })

      revalidatePath("/team")
      revalidatePath("/dashboard")
      return {
        ok: true,
        member: { membershipId: membership.id, name: fullName, email },
      }
    } catch (dbError) {
      // Compensate: the DB write failed, so roll back the Auth user.
      console.error("createMember: db write failed, rolling back auth user", {
        message: dbError instanceof Error ? dbError.message : "unknown",
      })
      const cleanup = await admin.auth.admin
        .deleteUser(authUserId)
        .catch((e) => ({ error: e as Error }))
      if (cleanup && "error" in cleanup && cleanup.error) {
        console.error("createMember: auth user cleanup FAILED — orphan", {
          authUserId,
        })
      }
      return { ok: false, error: GENERIC }
    }
  } catch (error) {
    return fail(error, "createMember")
  }
}

/**
 * Admin-only ("member:update", so OWNER/ADMIN — not SPONSORSHIP_LEAD) reset of a
 * member's password to a new temporary value. The new password is not persisted
 * or logged; the caller shows it once.
 */
export async function resetMemberPassword(
  membershipId: string,
  input: ResetMemberPasswordInput
): Promise<TeamActionResult> {
  const parsed = resetMemberPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const actor = await requirePermission("member:update")

    const target = await prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId: actor.organizationId,
        deactivatedAt: null,
      },
      select: { id: true, role: true, profileId: true },
    })
    if (!target) return { ok: false, error: "Üye bulunamadı." }

    if (target.role === "OWNER") {
      return {
        ok: false,
        error: "Organizasyon sahibinin şifresi bu akıştan sıfırlanamaz.",
      }
    }
    if (target.profileId === actor.profileId) {
      return {
        ok: false,
        error: "Kendi şifreni Ayarlar bölümünden değiştirebilirsin.",
      }
    }
    if (!canManageMember(actor.role, target.role)) {
      return { ok: false, error: "Bu üyenin şifresini sıfırlama yetkin yok." }
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(
      target.profileId,
      { password: parsed.data.password }
    )
    if (error) {
      console.error("resetMemberPassword: supabase updateUserById failed", {
        code: error.code,
        message: error.message,
      })
      return { ok: false, error: GENERIC }
    }

    return { ok: true }
  } catch (error) {
    return fail(error, "resetMemberPassword")
  }
}

export async function updateMemberRole(
  membershipId: string,
  input: RoleChangeInput
): Promise<TeamActionResult> {
  const parsed = roleChangeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: GENERIC }
  }

  try {
    const actor = await requirePermission("member:update")
    const nextRole = parsed.data.role

    const target = await prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId: actor.organizationId,
        deactivatedAt: null,
      },
      select: { id: true, role: true, profileId: true },
    })
    if (!target) return { ok: false, error: "Üye bulunamadı." }

    if (target.role === "OWNER") {
      return {
        ok: false,
        error: "Organizasyon sahibinin rolü bu akıştan değiştirilemez.",
      }
    }
    if (target.profileId === actor.profileId) {
      return { ok: false, error: "Kendi rolünü değiştiremezsin." }
    }
    if (
      !canManageMember(actor.role, target.role) ||
      !canGrantRole(actor.role, nextRole)
    ) {
      return { ok: false, error: "Bu rol değişikliğini yapma yetkin yok." }
    }

    const result = await prisma.organizationMembership.updateMany({
      where: {
        id: membershipId,
        organizationId: actor.organizationId,
        role: { not: "OWNER" },
      },
      data: { role: nextRole },
    })
    if (result.count === 0) return { ok: false, error: "Üye bulunamadı." }

    revalidatePath("/team")
    revalidatePath("/dashboard")
    return { ok: true }
  } catch (error) {
    return fail(error, "updateMemberRole")
  }
}

export async function removeMember(
  membershipId: string
): Promise<TeamActionResult> {
  try {
    const actor = await requirePermission("member:remove")

    const target = await prisma.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId: actor.organizationId,
        deactivatedAt: null,
      },
      select: { id: true, role: true, profileId: true },
    })
    if (!target) return { ok: false, error: "Üye bulunamadı." }

    if (target.role === "OWNER") {
      return { ok: false, error: "Organizasyon sahibi kaldırılamaz." }
    }
    if (target.profileId === actor.profileId) {
      return { ok: false, error: "Kendini ekipten çıkaramazsın." }
    }
    if (!canManageMember(actor.role, target.role)) {
      return { ok: false, error: "Bu üyeyi kaldırma yetkin yok." }
    }

    await prisma.$transaction([
      prisma.company.updateMany({
        where: {
          organizationId: actor.organizationId,
          ownerMembershipId: membershipId,
        },
        data: { ownerMembershipId: null },
      }),
      prisma.opportunity.updateMany({
        where: {
          organizationId: actor.organizationId,
          ownerMembershipId: membershipId,
          archivedAt: null,
        },
        data: { ownerMembershipId: actor.membershipId },
      }),
      prisma.task.updateMany({
        where: {
          organizationId: actor.organizationId,
          assignedToMembershipId: membershipId,
          archivedAt: null,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        data: { assignedToMembershipId: actor.membershipId },
      }),
      prisma.organizationMembership.update({
        where: { id: membershipId },
        data: { deactivatedAt: new Date() },
      }),
    ])

    revalidatePath("/team")
    revalidatePath("/companies")
    revalidatePath("/opportunities")
    revalidatePath("/tasks")
    revalidatePath("/dashboard")
    return { ok: true }
  } catch (error) {
    return fail(error, "removeMember")
  }
}

function fail(error: unknown, tag: string): { ok: false; error: string } {
  if (error instanceof ForbiddenError) {
    return { ok: false, error: error.message }
  }
  console.error(tag, error)
  return { ok: false, error: GENERIC }
}
