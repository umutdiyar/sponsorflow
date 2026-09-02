"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import {
  ForbiddenError,
  requirePermission,
} from "@/lib/auth/membership"
import { companyFormSchema, type CompanyFormInput } from "@/features/companies/schema"

export type CompanyActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

/** Ensure an owner membership id (if provided) really belongs to this org. */
async function assertOwnerInOrg(
  organizationId: string,
  ownerMembershipId: string | undefined
) {
  if (!ownerMembershipId) return
  const owner = await prisma.organizationMembership.findFirst({
    where: { id: ownerMembershipId, organizationId },
    select: { id: true },
  })
  if (!owner) {
    throw new ForbiddenError("Seçilen sorumlu bu organizasyona ait değil.")
  }
}

export async function createCompany(
  input: CompanyFormInput
): Promise<CompanyActionResult> {
  const parsed = companyFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("company:create")
    const data = parsed.data
    await assertOwnerInOrg(membership.organizationId, data.ownerMembershipId)

    const company = await prisma.company.create({
      data: {
        organizationId: membership.organizationId,
        createdByMembershipId: membership.membershipId,
        name: data.name,
        website: data.website,
        industry: data.industry,
        linkedinUrl: data.linkedinUrl,
        city: data.city,
        country: data.country,
        source: data.source,
        ownerMembershipId: data.ownerMembershipId,
      },
      select: { id: true },
    })

    revalidatePath("/companies")
    return { ok: true, id: company.id }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("createCompany", error)
    return { ok: false, error: GENERIC }
  }
}

export async function updateCompany(
  id: string,
  input: CompanyFormInput
): Promise<CompanyActionResult> {
  const parsed = companyFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("company:update")
    const data = parsed.data
    await assertOwnerInOrg(membership.organizationId, data.ownerMembershipId)

    // Scope the update to this org — an id from another org matches nothing.
    const result = await prisma.company.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: {
        name: data.name,
        website: data.website ?? null,
        industry: data.industry ?? null,
        linkedinUrl: data.linkedinUrl ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        source: data.source ?? null,
        ownerMembershipId: data.ownerMembershipId ?? null,
      },
    })

    if (result.count === 0) {
      return { ok: false, error: "Firma bulunamadı." }
    }

    revalidatePath("/companies")
    revalidatePath(`/companies/${id}`)
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("updateCompany", error)
    return { ok: false, error: GENERIC }
  }
}

export async function archiveCompany(
  id: string
): Promise<CompanyActionResult> {
  try {
    const membership = await requirePermission("company:archive")

    const result = await prisma.company.updateMany({
      where: {
        id,
        organizationId: membership.organizationId,
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    })

    if (result.count === 0) {
      return { ok: false, error: "Firma bulunamadı." }
    }

    revalidatePath("/companies")
    revalidatePath(`/companies/${id}`)
    return { ok: true, id }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("archiveCompany", error)
    return { ok: false, error: GENERIC }
  }
}
