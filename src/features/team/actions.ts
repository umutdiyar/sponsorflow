"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { canGrantRole, canManageMember } from "@/lib/auth/permissions"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getAppUrl } from "@/lib/env"
import {
  inviteMemberSchema,
  roleChangeSchema,
  type InviteMemberInput,
  type RoleChangeInput,
} from "@/features/team/schema"

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."
const INVITE_TTL_DAYS = 7

export type InviteResult =
  | { ok: true; id: string; emailDelivered: boolean; message?: string }
  | { ok: false; error: string }

export type TeamActionResult =
  | { ok: true }
  | { ok: false; error: string }

function expiresAt() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
}

async function sendSupabaseInvite(
  email: string,
  fullName: string | undefined,
  invitationId: string
): Promise<{ delivered: boolean; message?: string }> {
  try {
    const { error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${getAppUrl()}/auth/confirm`,
        data: {
          ...(fullName ? { full_name: fullName } : {}),
          sf_invitation: invitationId,
        },
      }
    )
    if (!error) return { delivered: true }

    const msg = `${error.message} ${error.code ?? ""}`.toLowerCase()
    if (
      msg.includes("already been registered") ||
      msg.includes("already registered") ||
      msg.includes("email_exists") ||
      error.code === "email_exists"
    ) {
      return {
        delivered: false,
        message:
          "Bu e-posta zaten Supabase'de kayıtlı. Kullanıcı giriş yaptığında davet otomatik kabul edilecek.",
      }
    }
    console.error("inviteUserByEmail", error)
    return {
      delivered: false,
      message:
        "Davet kaydedildi ancak e-posta gönderilemedi. Listeden yeniden gönderebilirsin.",
    }
  } catch (error) {
    console.error("inviteUserByEmail threw", error)
    return {
      delivered: false,
      message:
        "Davet kaydedildi ancak e-posta gönderilemedi. Listeden yeniden gönderebilirsin.",
    }
  }
}

export async function inviteMember(
  input: InviteMemberInput
): Promise<InviteResult> {
  const parsed = inviteMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const actor = await requirePermission("invitation:create")
    const { email, fullName, role } = parsed.data

    if (!canGrantRole(actor.role, role)) {
      return { ok: false, error: "Bu rolü atama yetkin yok." }
    }

    // Already an active member of this org?
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

    const invitation = await prisma.organizationInvitation.upsert({
      where: {
        organizationId_email: { organizationId: actor.organizationId, email },
      },
      create: {
        organizationId: actor.organizationId,
        email,
        fullName: fullName ?? null,
        role,
        invitedByMembershipId: actor.membershipId,
        status: "PENDING",
        expiresAt: expiresAt(),
      },
      update: {
        fullName: fullName ?? null,
        role,
        invitedByMembershipId: actor.membershipId,
        status: "PENDING",
        expiresAt: expiresAt(),
        acceptedAt: null,
      },
      select: { id: true },
    })

    const { delivered, message } = await sendSupabaseInvite(
      email,
      fullName,
      invitation.id
    )

    revalidatePath("/team")
    return { ok: true, id: invitation.id, emailDelivered: delivered, message }
  } catch (error) {
    return fail(error, "inviteMember")
  }
}

export async function resendInvitation(
  invitationId: string
): Promise<InviteResult> {
  try {
    const actor = await requirePermission("invitation:create")

    const invite = await prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId: actor.organizationId,
        status: "PENDING",
      },
      select: { id: true, email: true, fullName: true },
    })
    if (!invite) return { ok: false, error: "Davet bulunamadı." }

    await prisma.organizationInvitation.update({
      where: { id: invite.id },
      data: { expiresAt: expiresAt(), invitedByMembershipId: actor.membershipId },
    })

    const { delivered, message } = await sendSupabaseInvite(
      invite.email,
      invite.fullName ?? undefined,
      invite.id
    )

    revalidatePath("/team")
    return { ok: true, id: invite.id, emailDelivered: delivered, message }
  } catch (error) {
    return fail(error, "resendInvitation")
  }
}

export async function revokeInvitation(
  invitationId: string
): Promise<TeamActionResult> {
  try {
    const actor = await requirePermission("invitation:revoke")
    const result = await prisma.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId: actor.organizationId,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    })
    if (result.count === 0) {
      return { ok: false, error: "Davet bulunamadı." }
    }
    revalidatePath("/team")
    return { ok: true }
  } catch (error) {
    return fail(error, "revokeInvitation")
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
    if (!canManageMember(actor.role, target.role) || !canGrantRole(actor.role, nextRole)) {
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
