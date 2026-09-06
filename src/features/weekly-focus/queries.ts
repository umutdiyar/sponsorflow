import "server-only"

import { cache } from "react"

import { prisma } from "@/lib/db/prisma"
import { istanbulWeekBounds, parseIstanbulDate } from "@/lib/format"

export type FocusCompany = {
  id: string
  name: string
  ownerName: string | null
  contacted: boolean
  replied: boolean
  meeting: boolean
}

export type WeeklyFocusData = {
  id: string
  title: string
  startDate: Date
  endDate: Date
  targetCompanyCount: number | null
  isCurrentWeek: boolean
  companies: FocusCompany[]
  progress: {
    total: number
    contacted: number
    replied: number
    meeting: number
  }
}

function memberName(p: { fullName: string | null; email: string }) {
  return p.fullName?.trim() || p.email
}

/**
 * The active weekly focus: the one whose date window contains today, otherwise
 * the most recent one. Progress is derived from Activity data — nothing about
 * "contacted / replied / meeting" is stored.
 */
export async function getCurrentWeeklyFocus(
  organizationId: string
): Promise<WeeklyFocusData | null> {
  const { startKey, endKey } = istanbulWeekBounds()
  const weekStart = parseIstanbulDate(startKey)!

  const focus =
    (await prisma.weeklyFocus.findFirst({
      where: {
        organizationId,
        startDate: { lte: parseIstanbulDate(endKey)! },
        endDate: { gte: weekStart },
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        targetCompanyCount: true,
        companies: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
                archivedAt: true,
                owner: {
                  select: {
                    profile: { select: { fullName: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    })) ??
    (await prisma.weeklyFocus.findFirst({
      where: { organizationId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        targetCompanyCount: true,
        companies: {
          select: {
            company: {
              select: {
                id: true,
                name: true,
                archivedAt: true,
                owner: {
                  select: {
                    profile: { select: { fullName: true, email: true } },
                  },
                },
              },
            },
          },
        },
      },
    }))

  if (!focus) return null

  const rows = focus.companies
    .map((c) => c.company)
    .filter((c) => !c.archivedAt)
  const ids = rows.map((c) => c.id)

  const contacted = new Set<string>()
  const replied = new Set<string>()
  const meeting = new Set<string>()

  if (ids.length > 0) {
    const acts = await prisma.activity.findMany({
      where: { organizationId, companyId: { in: ids } },
      select: { companyId: true, direction: true, channel: true },
    })
    for (const a of acts) {
      if (a.direction === "OUTBOUND" && a.channel !== "INTERNAL") {
        contacted.add(a.companyId)
      }
      if (a.direction === "INBOUND") replied.add(a.companyId)
      if (a.channel === "MEETING") meeting.add(a.companyId)
    }
  }

  const companies: FocusCompany[] = rows
    .map((c) => ({
      id: c.id,
      name: c.name,
      ownerName: c.owner ? memberName(c.owner.profile) : null,
      contacted: contacted.has(c.id),
      replied: replied.has(c.id),
      meeting: meeting.has(c.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))

  return {
    id: focus.id,
    title: focus.title,
    startDate: focus.startDate,
    endDate: focus.endDate,
    targetCompanyCount: focus.targetCompanyCount,
    isCurrentWeek:
      focus.startDate.getTime() <= parseIstanbulDate(endKey)!.getTime() &&
      focus.endDate.getTime() >= weekStart.getTime(),
    companies,
    progress: {
      total: companies.length,
      contacted: contacted.size,
      replied: replied.size,
      meeting: meeting.size,
    },
  }
}

/** Company ids in the current focus — for the `/companies` quick filter.
 * Request-cached so the companies page can call it twice without a second hit. */
export const getCurrentFocusCompanyIds = cache(async function (
  organizationId: string
): Promise<string[]> {
  const { startKey, endKey } = istanbulWeekBounds()
  const focus =
    (await prisma.weeklyFocus.findFirst({
      where: {
        organizationId,
        startDate: { lte: parseIstanbulDate(endKey)! },
        endDate: { gte: parseIstanbulDate(startKey)! },
      },
      orderBy: { startDate: "desc" },
      select: { companies: { select: { companyId: true } } },
    })) ??
    (await prisma.weeklyFocus.findFirst({
      where: { organizationId },
      orderBy: { startDate: "desc" },
      select: { companies: { select: { companyId: true } } },
    }))
  return focus ? focus.companies.map((c) => c.companyId) : []
})
