"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import {
  packageFormSchema,
  type PackageFormInput,
} from "@/features/packages/schema"

export type PackageActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

export async function createPackage(
  input: PackageFormInput
): Promise<PackageActionResult> {
  const parsed = packageFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("package:create")
    const data = parsed.data

    const last = await prisma.sponsorshipPackage.findFirst({
      where: { organizationId: membership.organizationId },
      select: { position: true },
      orderBy: { position: "desc" },
    })

    const created = await prisma.sponsorshipPackage.create({
      data: {
        organizationId: membership.organizationId,
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? null,
        currency: data.currency,
        benefits: data.benefits,
        isActive: data.isActive,
        position: (last?.position ?? -1) + 1,
      },
      select: { id: true },
    })

    revalidatePath("/packages")
    return { ok: true, id: created.id }
  } catch (error) {
    return failure(error, "createPackage")
  }
}

export async function updatePackage(
  id: string,
  input: PackageFormInput
): Promise<PackageActionResult> {
  const parsed = packageFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("package:update")
    const data = parsed.data

    const result = await prisma.sponsorshipPackage.updateMany({
      where: { id, organizationId: membership.organizationId },
      data: {
        name: data.name,
        description: data.description ?? null,
        price: data.price ?? null,
        currency: data.currency,
        benefits: data.benefits,
        isActive: data.isActive,
      },
    })
    if (result.count === 0) {
      return { ok: false, error: "Paket bulunamadı." }
    }

    revalidatePath("/packages")
    revalidatePath("/opportunities")
    return { ok: true, id }
  } catch (error) {
    return failure(error, "updatePackage")
  }
}

export async function archivePackage(
  id: string
): Promise<PackageActionResult> {
  try {
    const membership = await requirePermission("package:archive")
    const result = await prisma.sponsorshipPackage.updateMany({
      where: {
        id,
        organizationId: membership.organizationId,
        archivedAt: null,
      },
      data: { archivedAt: new Date(), isActive: false },
    })
    if (result.count === 0) {
      return { ok: false, error: "Paket bulunamadı." }
    }
    revalidatePath("/packages")
    return { ok: true, id }
  } catch (error) {
    return failure(error, "archivePackage")
  }
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
