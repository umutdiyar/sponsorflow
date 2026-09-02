"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { parseIstanbulDate } from "@/lib/format"
import { recordStageChange } from "@/features/activities/internal"
import {
  nextActionSchema,
  opportunityFormSchema,
  stageChangeSchema,
  type NextActionInput,
  type OpportunityFormInput,
  type StageChangeInput,
} from "@/features/opportunities/schema"

export type OpportunityActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export type StageChangeResult =
  | { ok: true; id: string; stageId: string; updatedAt: string }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

/** Verify company / owner / stage / package all live in this org. Throws. */
async function assertRefsInOrg(
  organizationId: string,
  refs: {
    companyId?: string
    ownerMembershipId?: string
    stageId?: string
    packageId?: string
  }
) {
  const checks: Promise<void>[] = []

  if (refs.companyId) {
    checks.push(
      prisma.company
        .findFirst({
          where: {
            id: refs.companyId,
            organizationId,
            archivedAt: null,
          },
          select: { id: true },
        })
        .then((r) => {
          if (!r) throw new ForbiddenError("Seçilen firma bulunamadı.")
        })
    )
  }
  if (refs.ownerMembershipId) {
    checks.push(
      prisma.organizationMembership
        .findFirst({
          where: { id: refs.ownerMembershipId, organizationId },
          select: { id: true },
        })
        .then((r) => {
          if (!r)
            throw new ForbiddenError(
              "Seçilen sorumlu bu organizasyona ait değil."
            )
        })
    )
  }
  if (refs.stageId) {
    checks.push(
      prisma.pipelineStage
        .findFirst({
          where: { id: refs.stageId, organizationId },
          select: { id: true },
        })
        .then((r) => {
          if (!r) throw new ForbiddenError("Seçilen aşama bulunamadı.")
        })
    )
  }
  if (refs.packageId) {
    checks.push(
      prisma.sponsorshipPackage
        .findFirst({
          where: { id: refs.packageId, organizationId },
          select: { id: true },
        })
        .then((r) => {
          if (!r) throw new ForbiddenError("Seçilen paket bulunamadı.")
        })
    )
  }

  await Promise.all(checks)
}

function toDateOrNull(value: string | undefined): Date | null {
  if (!value) return null
  return parseIstanbulDate(value)
}

export async function createOpportunity(
  input: OpportunityFormInput
): Promise<OpportunityActionResult> {
  const parsed = opportunityFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("opportunity:create")
    const data = parsed.data

    await assertRefsInOrg(membership.organizationId, {
      companyId: data.companyId,
      ownerMembershipId: data.ownerMembershipId,
      stageId: data.stageId,
      packageId: data.packageId,
    })

    const created = await prisma.opportunity.create({
      data: {
        organizationId: membership.organizationId,
        companyId: data.companyId,
        title: data.title,
        ownerMembershipId: data.ownerMembershipId,
        stageId: data.stageId,
        packageId: data.packageId ?? null,
        estimatedValue: data.estimatedValue ?? null,
        probability: data.probability ?? null,
        nextAction: data.nextAction ?? null,
        nextActionAt: toDateOrNull(data.nextActionAt),
        expectedCloseDate: toDateOrNull(data.expectedCloseDate),
        createdByMembershipId: membership.membershipId,
      },
      select: { id: true },
    })

    revalidatePath("/opportunities")
    revalidatePath("/pipeline")
    revalidatePath("/dashboard")
    return { ok: true, id: created.id }
  } catch (error) {
    return failure(error, "createOpportunity")
  }
}

export async function updateOpportunity(
  id: string,
  input: OpportunityFormInput
): Promise<OpportunityActionResult> {
  const parsed = opportunityFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("opportunity:update")
    const data = parsed.data

    const current = await prisma.opportunity.findFirst({
      where: { id, organizationId: membership.organizationId },
      select: {
        id: true,
        companyId: true,
        stageId: true,
        stage: { select: { name: true } },
      },
    })
    if (!current) return { ok: false, error: "Fırsat bulunamadı." }

    await assertRefsInOrg(membership.organizationId, {
      companyId: data.companyId,
      ownerMembershipId: data.ownerMembershipId,
      stageId: data.stageId,
      packageId: data.packageId,
    })

    const stageChanged = data.stageId !== current.stageId

    await prisma.$transaction(async (tx) => {
      await tx.opportunity.update({
        where: { id: current.id },
        data: {
          companyId: data.companyId,
          title: data.title,
          ownerMembershipId: data.ownerMembershipId,
          stageId: data.stageId,
          packageId: data.packageId ?? null,
          estimatedValue: data.estimatedValue ?? null,
          probability: data.probability ?? null,
          nextAction: data.nextAction ?? null,
          nextActionAt: toDateOrNull(data.nextActionAt),
          expectedCloseDate: toDateOrNull(data.expectedCloseDate),
        },
      })

      if (stageChanged) {
        const toStage = await tx.pipelineStage.findUnique({
          where: { id: data.stageId },
          select: { name: true },
        })
        await recordStageChange(tx, {
          organizationId: membership.organizationId,
          companyId: data.companyId,
          opportunityId: current.id,
          membershipId: membership.membershipId,
          fromStageName: current.stage.name,
          toStageName: toStage?.name ?? "—",
        })
      }
    })

    revalidateOpportunity(id)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updateOpportunity")
  }
}

export async function changeOpportunityStage(
  id: string,
  input: StageChangeInput
): Promise<StageChangeResult> {
  const parsed = stageChangeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("pipeline:update")
    const { stageId, lostReason } = parsed.data

    const current = await prisma.opportunity.findFirst({
      where: { id, organizationId: membership.organizationId },
      select: {
        id: true,
        companyId: true,
        stageId: true,
        lostReason: true,
        stage: { select: { name: true } },
      },
    })
    if (!current) return { ok: false, error: "Fırsat bulunamadı." }

    const target = await prisma.pipelineStage.findFirst({
      where: { id: stageId, organizationId: membership.organizationId },
      select: { id: true, name: true, type: true },
    })
    if (!target) return { ok: false, error: "Seçilen aşama bulunamadı." }

    if (target.id === current.stageId && !lostReason) {
      return {
        ok: true,
        id,
        stageId: current.stageId,
        updatedAt: new Date().toISOString(),
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.opportunity.update({
        where: { id: current.id },
        data: {
          stageId: target.id,
          lostReason:
            target.type === "LOST"
              ? (lostReason ?? current.lostReason ?? null)
              : null,
        },
        select: { id: true, stageId: true, updatedAt: true },
      })

      if (target.id !== current.stageId) {
        await recordStageChange(tx, {
          organizationId: membership.organizationId,
          companyId: current.companyId,
          opportunityId: current.id,
          membershipId: membership.membershipId,
          fromStageName: current.stage.name,
          toStageName: target.name,
        })
      }
      return next
    })

    revalidateOpportunity(id)
    return {
      ok: true,
      id: updated.id,
      stageId: updated.stageId,
      updatedAt: updated.updatedAt.toISOString(),
    }
  } catch (error) {
    return failure(error, "changeOpportunityStage")
  }
}

export async function archiveOpportunity(
  id: string
): Promise<OpportunityActionResult> {
  try {
    const membership = await requirePermission("opportunity:archive")
    const result = await prisma.opportunity.updateMany({
      where: {
        id,
        organizationId: membership.organizationId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    })
    if (result.count === 0) {
      return { ok: false, error: "Fırsat bulunamadı." }
    }
    revalidateOpportunity(id)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "archiveOpportunity")
  }
}

export async function updateNextAction(
  id: string,
  input: NextActionInput
): Promise<OpportunityActionResult> {
  const parsed = nextActionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("opportunity:update")
    const result = await prisma.opportunity.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: {
        nextAction: parsed.data.nextAction ?? null,
        nextActionAt: parsed.data.nextActionAt
          ? parseIstanbulDate(parsed.data.nextActionAt)
          : null,
      },
    })
    if (result.count === 0) {
      return { ok: false, error: "Fırsat bulunamadı." }
    }
    revalidateOpportunity(id)
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updateNextAction")
  }
}

function revalidateOpportunity(id: string) {
  revalidatePath("/opportunities")
  revalidatePath(`/opportunities/${id}`)
  revalidatePath("/pipeline")
  revalidatePath("/dashboard")
}

function failure(
  error: unknown,
  tag: string
): { ok: false; error: string } {
  if (error instanceof ForbiddenError) {
    return { ok: false, error: error.message }
  }
  console.error(tag, error)
  return { ok: false, error: GENERIC }
}
