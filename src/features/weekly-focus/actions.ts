"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import {
  formatDayMonth,
  istanbulWeekBounds,
  parseIstanbulDate,
} from "@/lib/format"

export type FocusActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

/**
 * Ensures a WeeklyFocus row exists for the current Istanbul week and returns
 * its id. A single focus per week is the intended model.
 */
async function ensureCurrentFocus(
  organizationId: string,
  membershipId: string
): Promise<string> {
  const { startKey, endKey } = istanbulWeekBounds()
  const start = parseIstanbulDate(startKey)!
  const end = parseIstanbulDate(endKey)!

  const existing = await prisma.weeklyFocus.findFirst({
    where: {
      organizationId,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    orderBy: { startDate: "desc" },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.weeklyFocus.create({
    data: {
      organizationId,
      title: `${formatDayMonth(start)} – ${formatDayMonth(end)} haftası`,
      startDate: start,
      endDate: end,
      createdByMembershipId: membershipId,
    },
    select: { id: true },
  })
  return created.id
}

/** Replace the current week's focus company set (and optional target). */
export async function saveWeeklyFocus(input: {
  companyIds: string[]
  targetCompanyCount?: number | null
}): Promise<FocusActionResult> {
  try {
    const membership = await requirePermission("focus:manage")
    const orgId = membership.organizationId

    // Keep only same-org, non-archived companies (server-side IDOR guard).
    const ids = [...new Set(input.companyIds)].filter(Boolean).slice(0, 200)
    const valid =
      ids.length > 0
        ? (
            await prisma.company.findMany({
              where: { id: { in: ids }, organizationId: orgId, archivedAt: null },
              select: { id: true },
            })
          ).map((c) => c.id)
        : []

    const focusId = await ensureCurrentFocus(orgId, membership.membershipId)

    await prisma.$transaction([
      prisma.weeklyFocusCompany.deleteMany({ where: { focusId } }),
      ...(valid.length > 0
        ? [
            prisma.weeklyFocusCompany.createMany({
              data: valid.map((companyId) => ({ focusId, companyId })),
              skipDuplicates: true,
            }),
          ]
        : []),
      prisma.weeklyFocus.update({
        where: { id: focusId },
        data: {
          targetCompanyCount:
            input.targetCompanyCount != null && input.targetCompanyCount > 0
              ? Math.trunc(input.targetCompanyCount)
              : null,
        },
      }),
    ])

    revalidatePath("/dashboard")
    revalidatePath("/companies")
    return { ok: true, id: focusId }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("saveWeeklyFocus", error)
    return { ok: false, error: GENERIC }
  }
}
