"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { parseIstanbulLocal } from "@/lib/format"
import {
  activityFormSchema,
  type ActivityFormInput,
} from "@/features/activities/schema"
import {
  getActivitiesFeed,
  type ActivityFeedResult,
  type ActivityListItem,
} from "@/features/activities/queries"

export type ActivityActionResult =
  | { ok: true; activity: ActivityListItem }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

function memberName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email
}

export async function logActivity(
  input: ActivityFormInput
): Promise<ActivityActionResult> {
  const parsed = activityFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("activity:create")
    const data = parsed.data
    const orgId = membership.organizationId

    const occurredAt = parseIstanbulLocal(data.occurredAt)
    if (!occurredAt) {
      return { ok: false, error: "Geçerli bir tarih gir." }
    }

    // Resolve the company. If an opportunity is given, its company wins and is
    // verified to belong to this org (IDOR guard).
    let companyId = data.companyId ?? null
    let opportunityId: string | null = null

    if (data.opportunityId) {
      const opp = await prisma.opportunity.findFirst({
        where: { id: data.opportunityId, organizationId: orgId },
        select: { id: true, companyId: true },
      })
      if (!opp) return { ok: false, error: "Fırsat bulunamadı." }
      opportunityId = opp.id
      companyId = opp.companyId
    }

    if (!companyId) {
      return { ok: false, error: "Firma bulunamadı." }
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId },
      select: { id: true },
    })
    if (!company) return { ok: false, error: "Firma bulunamadı." }

    // Contact (optional) must belong to the same company.
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: data.contactId,
          organizationId: orgId,
          companyId,
        },
        select: { id: true },
      })
      if (!contact) {
        return { ok: false, error: "Seçilen kişi bu firmaya ait değil." }
      }
    }

    const created = await prisma.activity.create({
      data: {
        organizationId: orgId,
        companyId,
        opportunityId,
        contactId: data.contactId ?? null,
        createdByMembershipId: membership.membershipId,
        type: data.type,
        title: data.title ?? null,
        description: data.description ?? null,
        occurredAt,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        occurredAt: true,
        createdAt: true,
        companyId: true,
        opportunityId: true,
        company: { select: { name: true } },
        opportunity: { select: { title: true } },
        contact: { select: { firstName: true, lastName: true } },
        createdBy: {
          select: { profile: { select: { fullName: true, email: true } } },
        },
      },
    })

    revalidatePath("/activities")
    revalidatePath("/dashboard")
    if (opportunityId) revalidatePath(`/opportunities/${opportunityId}`)
    revalidatePath(`/companies/${companyId}`)

    return {
      ok: true,
      activity: {
        id: created.id,
        type: created.type,
        title: created.title,
        description: created.description,
        occurredAt: created.occurredAt,
        createdAt: created.createdAt,
        author: memberName(created.createdBy.profile),
        companyId: created.companyId,
        companyName: created.company.name,
        opportunityId: created.opportunityId,
        opportunityTitle: created.opportunity?.title ?? null,
        contactName: created.contact
          ? `${created.contact.firstName} ${created.contact.lastName}`.trim()
          : null,
      },
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("logActivity", error)
    return { ok: false, error: GENERIC }
  }
}

export type ActivityFeedInput = {
  type?: string
  memberId?: string
  companyId?: string
  from?: string
  to?: string
  cursor?: string
}

/** Read one page of the global feed — used for "load more" in the client. */
export async function fetchActivityPage(
  input: ActivityFeedInput
): Promise<ActivityFeedResult> {
  const membership = await requirePermission("activity:read")
  return getActivitiesFeed({
    organizationId: membership.organizationId,
    type: input.type,
    memberId: input.memberId,
    companyId: input.companyId,
    from: input.from,
    to: input.to,
    cursor: input.cursor,
  })
}
