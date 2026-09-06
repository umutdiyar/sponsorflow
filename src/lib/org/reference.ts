import "server-only"

import { cache } from "react"

import { prisma } from "@/lib/db/prisma"
import type { PipelineStageType } from "@/generated/prisma/enums"

/**
 * Small org-scoped reference lists shared by the opportunity / task / activity
 * forms and filters. Every query is filtered by `organizationId` — the caller
 * passes the id from `getCurrentMembership()`, never from the client.
 */

export type MemberRef = { membershipId: string; name: string }
export type StageRef = {
  id: string
  name: string
  key: string
  type: PipelineStageType
  position: number
}
export type PackageRef = { id: string; name: string }
export type CompanyRef = { id: string; name: string }

function memberName(profile: { fullName: string | null; email: string }) {
  return profile.fullName?.trim() || profile.email
}

export const listMembers = cache(async function listMembers(
  organizationId: string
): Promise<MemberRef[]> {
  const rows = await prisma.organizationMembership.findMany({
    where: { organizationId },
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return rows.map((r) => ({
    membershipId: r.id,
    name: memberName(r.profile),
  }))
})

export const listStages = cache(async function listStages(
  organizationId: string
): Promise<StageRef[]> {
  const rows = await prisma.pipelineStage.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, key: true, type: true, position: true },
    orderBy: { position: "asc" },
  })
  return rows
})

export const listActivePackages = cache(async function listActivePackages(
  organizationId: string
): Promise<PackageRef[]> {
  const rows = await prisma.sponsorshipPackage.findMany({
    where: { organizationId, isActive: true, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { position: "asc" },
  })
  return rows
})

export const listCompanyOptions = cache(async function listCompanyOptions(
  organizationId: string
): Promise<CompanyRef[]> {
  const rows = await prisma.company.findMany({
    where: { organizationId, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 1000,
  })
  return rows
})

export type ContactOptionRef = {
  id: string
  name: string
  email: string | null
  linkedinUrl: string | null
}

export async function listContactOptions(
  organizationId: string,
  companyId: string
): Promise<ContactOptionRef[]> {
  const rows = await prisma.contact.findMany({
    where: { organizationId, companyId, archivedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      linkedinUrl: true,
    },
    orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
  })
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim(),
    email: r.email,
    linkedinUrl: r.linkedinUrl,
  }))
}

/** The stage an opportunity should default to: first OPEN stage by position. */
export function defaultStageId(stages: StageRef[]): string | undefined {
  return (
    stages.find((s) => s.type === "OPEN")?.id ?? stages[0]?.id ?? undefined
  )
}
