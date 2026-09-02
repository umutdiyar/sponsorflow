"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import {
  contactFormSchema,
  type ContactFormInput,
} from "@/features/contacts/schema"

export type CreatedContact = {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  department: string | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  notes: string | null
  isPrimary: boolean
}

export type ContactActionResult =
  | { ok: true; contact: CreatedContact }
  | { ok: false; error: string }

const GENERIC = "İşlem tamamlanamadı. Lütfen tekrar dene."

export async function createContact(
  companyId: string,
  input: ContactFormInput
): Promise<ContactActionResult> {
  const parsed = contactFormSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("contact:create")
    const data = parsed.data

    // The company must exist *within this org* — IDOR guard.
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        organizationId: membership.organizationId,
        archivedAt: null,
      },
      select: { id: true },
    })
    if (!company) {
      return { ok: false, error: "Firma bulunamadı." }
    }

    const contact = await prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.contact.updateMany({
          where: { companyId, isPrimary: true },
          data: { isPrimary: false },
        })
      }
      return tx.contact.create({
        data: {
          organizationId: membership.organizationId,
          companyId,
          createdByMembershipId: membership.membershipId,
          firstName: data.firstName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          department: data.department,
          email: data.email,
          phone: data.phone,
          linkedinUrl: data.linkedinUrl,
          notes: data.notes,
          isPrimary: data.isPrimary,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          notes: true,
          isPrimary: true,
        },
      })
    })

    revalidatePath(`/companies/${companyId}`)
    return { ok: true, contact }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message }
    }
    console.error("createContact", error)
    return { ok: false, error: GENERIC }
  }
}
