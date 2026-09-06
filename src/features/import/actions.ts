"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import {
  coerceUrl,
  domainOf,
  normalizeName,
} from "@/features/import/fields"
import {
  importRequestSchema,
  type AnalyzedRow,
  type ImportAnalysis,
  type ImportOutcome,
  type ImportRequest,
  type RowStatus,
} from "@/features/import/schema"

const GENERIC = "İçe aktarma tamamlanamadı. Lütfen tekrar dene."

type AnalyzeResult =
  | { ok: true; analysis: ImportAnalysis }
  | { ok: false; error: string }

type RunResult =
  | { ok: true; outcome: ImportOutcome }
  | { ok: false; error: string }

type OrgContext = {
  organizationId: string
  membershipId: string
  /** normalized member name / lowercased email -> membership id (active only) */
  owners: Map<string, string>
  existingByName: Map<string, { id: string; name: string }>
  existingByDomain: Map<string, { id: string; name: string }>
}

async function loadContext(
  organizationId: string,
  membershipId: string
): Promise<OrgContext> {
  const [members, companies] = await Promise.all([
    prisma.organizationMembership.findMany({
      where: { organizationId, deactivatedAt: null },
      select: {
        id: true,
        profile: { select: { fullName: true, email: true } },
      },
    }),
    prisma.company.findMany({
      where: { organizationId, archivedAt: null },
      select: { id: true, name: true, domain: true, website: true },
    }),
  ])

  const owners = new Map<string, string>()
  for (const m of members) {
    if (m.profile.fullName?.trim()) {
      owners.set(normalizeName(m.profile.fullName), m.id)
    }
    owners.set(m.profile.email.trim().toLowerCase(), m.id)
  }

  const existingByName = new Map<string, { id: string; name: string }>()
  const existingByDomain = new Map<string, { id: string; name: string }>()
  for (const c of companies) {
    const key = normalizeName(c.name)
    if (key) existingByName.set(key, { id: c.id, name: c.name })
    const dom = c.domain?.toLowerCase() || domainOf(c.website)
    if (dom) existingByDomain.set(dom, { id: c.id, name: c.name })
  }

  return {
    organizationId,
    membershipId,
    owners,
    existingByName,
    existingByDomain,
  }
}

type Classified = {
  row: AnalyzedRow
  /** cleaned values, only present when the row can become a company */
  clean: {
    name: string
    industry: string | null
    website: string | null
    linkedinUrl: string | null
    city: string | null
    country: string | null
    source: string | null
    ownerMembershipId: string | null
    contactFirstName: string | null
    contactLastName: string | null
    contactEmail: string | null
    contactLinkedinUrl: string | null
  } | null
}

function classify(
  request: ImportRequest,
  ctx: OrgContext
): { rows: Classified[]; unknownOwners: Set<string> } {
  const seenNames = new Set<string>()
  const seenDomains = new Set<string>()
  const unknownOwners = new Set<string>()
  const rows: Classified[] = []

  request.rows.forEach((raw, index) => {
    const name = raw.name ?? null

    if (!name) {
      rows.push({
        row: {
          index,
          name: null,
          status: "missing",
          message: "Firma adı boş.",
          matchCompanyId: null,
          matchName: null,
          ownerResolved: null,
        },
        clean: null,
      })
      return
    }

    const website = coerceUrl(raw.website)
    const linkedinUrl = coerceUrl(raw.linkedinUrl)
    const domain = domainOf(website)
    const nameKey = normalizeName(name)

    let ownerMembershipId: string | null = null
    let ownerResolved: string | null = null
    if (raw.ownerName) {
      const hit =
        ctx.owners.get(normalizeName(raw.ownerName)) ??
        ctx.owners.get(raw.ownerName.toLowerCase())
      if (hit) {
        ownerMembershipId = hit
        ownerResolved = raw.ownerName
      } else {
        unknownOwners.add(raw.ownerName)
      }
    }

    const messages: string[] = []
    if (raw.website && !website) messages.push("web sitesi geçersiz")
    if (raw.linkedinUrl && !linkedinUrl) messages.push("LinkedIn geçersiz")
    if (raw.ownerName && !ownerMembershipId) messages.push("sorumlu eşleşmedi")

    let status: RowStatus = "valid"
    let matchCompanyId: string | null = null
    let matchName: string | null = null

    const dbMatch =
      (domain ? ctx.existingByDomain.get(domain) : undefined) ??
      ctx.existingByName.get(nameKey)

    if (dbMatch) {
      status = "duplicate"
      matchCompanyId = dbMatch.id
      matchName = dbMatch.name
      messages.unshift(`mevcut kayıt: ${dbMatch.name}`)
    } else if (seenNames.has(nameKey) || (domain && seenDomains.has(domain))) {
      status = "duplicate"
      messages.unshift("dosyada tekrar ediyor")
    }

    seenNames.add(nameKey)
    if (domain) seenDomains.add(domain)

    rows.push({
      row: {
        index,
        name,
        status,
        message: messages.length ? messages.join(" · ") : null,
        matchCompanyId,
        matchName,
        ownerResolved,
      },
      clean: {
        name,
        industry: raw.industry ?? null,
        website,
        linkedinUrl,
        city: raw.city ?? null,
        country: raw.country ?? null,
        source: raw.source ?? null,
        ownerMembershipId,
        contactFirstName: raw.contactFirstName ?? null,
        contactLastName: raw.contactLastName ?? null,
        contactEmail: raw.contactEmail ?? null,
        contactLinkedinUrl: raw.contactLinkedinUrl ?? null,
      },
    })
  })

  return { rows, unknownOwners }
}

function tally(rows: Classified[]): Record<RowStatus, number> {
  const counts: Record<RowStatus, number> = {
    valid: 0,
    missing: 0,
    duplicate: 0,
    error: 0,
  }
  for (const r of rows) counts[r.row.status] += 1
  return counts
}

/** Dry run — classify + duplicate check, no writes. */
export async function analyzeCompanyImport(
  input: ImportRequest
): Promise<AnalyzeResult> {
  const parsed = importRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("data:import")
    const ctx = await loadContext(
      membership.organizationId,
      membership.membershipId
    )
    const { rows, unknownOwners } = classify(parsed.data, ctx)

    return {
      ok: true,
      analysis: {
        rows: rows.map((r) => r.row),
        counts: tally(rows),
        unknownOwners: [...unknownOwners],
      },
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message || "Yetkin yok." }
    }
    console.error("analyzeCompanyImport", error)
    return { ok: false, error: GENERIC }
  }
}

/** Commit the import in a single transaction and record a DataImport row. */
export async function runCompanyImport(
  input: ImportRequest
): Promise<RunResult> {
  const parsed = importRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    const membership = await requirePermission("data:import")
    const orgId = membership.organizationId
    const ctx = await loadContext(orgId, membership.membershipId)
    const { rows } = classify(parsed.data, ctx)
    const strategy = parsed.data.duplicateStrategy

    const newCompanies: {
      id: string
      organizationId: string
      createdByMembershipId: string
      name: string
      industry: string | null
      website: string | null
      domain: string | null
      linkedinUrl: string | null
      city: string | null
      country: string | null
      source: string | null
      ownerMembershipId: string | null
    }[] = []
    const companyUpdates: { id: string; data: Record<string, unknown> }[] = []
    const newContacts: {
      organizationId: string
      companyId: string
      createdByMembershipId: string
      firstName: string
      lastName: string
      email: string | null
      linkedinUrl: string | null
      isPrimary: boolean
    }[] = []

    let importedRows = 0
    let updatedRows = 0
    let skippedRows = 0
    let failedRows = 0

    for (const { row, clean } of rows) {
      if (!clean || row.status === "missing" || row.status === "error") {
        failedRows += 1
        continue
      }

      const isDbDuplicate = Boolean(row.matchCompanyId)
      const isDuplicate = row.status === "duplicate"

      // Decide the disposition for this row.
      let disposition: "create" | "update" | "skip" = "create"
      if (isDuplicate) {
        if (strategy === "skip") disposition = "skip"
        else if (strategy === "update")
          disposition = isDbDuplicate ? "update" : "skip"
        else disposition = "create"
      }

      if (disposition === "skip") {
        skippedRows += 1
        continue
      }

      if (disposition === "update" && row.matchCompanyId) {
        const data: Record<string, unknown> = {}
        if (clean.industry) data.industry = clean.industry
        if (clean.website) data.website = clean.website
        if (clean.website) data.domain = domainOf(clean.website)
        if (clean.linkedinUrl) data.linkedinUrl = clean.linkedinUrl
        if (clean.city) data.city = clean.city
        if (clean.country) data.country = clean.country
        if (clean.source) data.source = clean.source
        if (clean.ownerMembershipId)
          data.ownerMembershipId = clean.ownerMembershipId
        if (Object.keys(data).length > 0) {
          companyUpdates.push({ id: row.matchCompanyId, data })
        }
        updatedRows += 1
        continue
      }

      // create
      const id = randomUUID()
      newCompanies.push({
        id,
        organizationId: orgId,
        createdByMembershipId: membership.membershipId,
        name: clean.name,
        industry: clean.industry,
        website: clean.website,
        domain: domainOf(clean.website),
        linkedinUrl: clean.linkedinUrl,
        city: clean.city,
        country: clean.country,
        source: clean.source,
        ownerMembershipId: clean.ownerMembershipId,
      })
      if (clean.contactFirstName || clean.contactEmail) {
        newContacts.push({
          organizationId: orgId,
          companyId: id,
          createdByMembershipId: membership.membershipId,
          firstName: clean.contactFirstName ?? clean.contactEmail ?? "—",
          lastName: clean.contactLastName ?? "",
          email: clean.contactEmail,
          linkedinUrl: clean.contactLinkedinUrl,
          isPrimary: true,
        })
      }
      importedRows += 1
    }

    const outcome = await prisma.$transaction(
      async (tx) => {
        if (newCompanies.length > 0) {
          await tx.company.createMany({ data: newCompanies })
        }
        for (const u of companyUpdates) {
          await tx.company.updateMany({
            where: { id: u.id, organizationId: orgId },
            data: u.data,
          })
        }
        if (newContacts.length > 0) {
          await tx.contact.createMany({ data: newContacts })
        }
        const record = await tx.dataImport.create({
          data: {
            organizationId: orgId,
            createdByMembershipId: membership.membershipId,
            fileName: parsed.data.fileName,
            type: "COMPANY",
            totalRows: parsed.data.rows.length,
            importedRows,
            updatedRows,
            skippedRows,
            failedRows,
          },
          select: { id: true },
        })
        return record
      },
      { timeout: 30_000, maxWait: 10_000 }
    )

    revalidatePath("/companies")
    revalidatePath("/import")
    revalidatePath("/dashboard")

    return {
      ok: true,
      outcome: {
        importId: outcome.id,
        totalRows: parsed.data.rows.length,
        importedRows,
        updatedRows,
        skippedRows,
        failedRows,
      },
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message || "Yetkin yok." }
    }
    console.error("runCompanyImport", error)
    return { ok: false, error: GENERIC }
  }
}
