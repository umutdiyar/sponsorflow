"use server"

import Papa from "papaparse"

import { prisma } from "@/lib/db/prisma"
import { ForbiddenError, requirePermission } from "@/lib/auth/membership"
import { formatDate } from "@/lib/format"
import { getCurrentFocusCompanyIds } from "@/features/weekly-focus/queries"
import {
  exportRequestSchema,
  EXPORT_TYPE_LABELS,
  type ExportRequest,
  type ExportResult,
  type ExportType,
} from "@/features/export/schema"

const GENERIC = "Dışa aktarma tamamlanamadı. Lütfen tekrar dene."

function memberName(p: { fullName: string | null; email: string }) {
  return p.fullName?.trim() || p.email
}

type Row = Record<string, string | number>

async function companyRows(
  organizationId: string,
  filters: ExportRequest["filters"]
): Promise<Row[]> {
  const where: Record<string, unknown> = { organizationId }
  if (!filters.includeArchived) where.archivedAt = null
  if (filters.owner === "unassigned") where.ownerMembershipId = null
  else if (filters.owner) where.ownerMembershipId = filters.owner
  if (filters.industry) where.industry = filters.industry
  if (filters.focusOnly) {
    where.id = { in: await getCurrentFocusCompanyIds(organizationId) }
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      industry: true,
      website: true,
      linkedinUrl: true,
      city: true,
      country: true,
      source: true,
      owner: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
    },
  })

  const lastByCompany = new Map<string, Date>()
  if (companies.length > 0) {
    const grouped = await prisma.activity.groupBy({
      by: ["companyId"],
      where: { organizationId, companyId: { in: companies.map((c) => c.id) } },
      _max: { occurredAt: true },
    })
    for (const g of grouped) {
      if (g._max.occurredAt) lastByCompany.set(g.companyId, g._max.occurredAt)
    }
  }

  return companies.map((c) => ({
    "Firma Adı": c.name,
    Sektör: c.industry ?? "",
    Sorumlu: c.owner ? memberName(c.owner.profile) : "Atanmamış",
    Website: c.website ?? "",
    LinkedIn: c.linkedinUrl ?? "",
    Şehir: c.city ?? "",
    Ülke: c.country ?? "",
    Kaynak: c.source ?? "",
    "Son İletişim": lastByCompany.has(c.id)
      ? formatDate(lastByCompany.get(c.id)!)
      : "",
  }))
}

async function contactRows(
  organizationId: string,
  filters: ExportRequest["filters"]
): Promise<Row[]> {
  const companyWhere: Record<string, unknown> = {}
  if (filters.owner === "unassigned") companyWhere.ownerMembershipId = null
  else if (filters.owner) companyWhere.ownerMembershipId = filters.owner
  if (filters.industry) companyWhere.industry = filters.industry
  if (filters.focusOnly) {
    companyWhere.id = { in: await getCurrentFocusCompanyIds(organizationId) }
  }

  const contacts = await prisma.contact.findMany({
    where: {
      organizationId,
      archivedAt: null,
      ...(Object.keys(companyWhere).length ? { company: companyWhere } : {}),
    },
    orderBy: [{ company: { name: "asc" } }, { lastName: "asc" }],
    select: {
      firstName: true,
      lastName: true,
      jobTitle: true,
      email: true,
      phone: true,
      linkedinUrl: true,
      isPrimary: true,
      company: { select: { name: true } },
    },
  })

  return contacts.map((c) => ({
    Ad: c.firstName,
    Soyad: c.lastName,
    Ünvan: c.jobTitle ?? "",
    Firma: c.company.name,
    "E-posta": c.email ?? "",
    Telefon: c.phone ?? "",
    LinkedIn: c.linkedinUrl ?? "",
    Birincil: c.isPrimary ? "Evet" : "Hayır",
  }))
}

async function opportunityRows(
  organizationId: string,
  filters: ExportRequest["filters"]
): Promise<Row[]> {
  const where: Record<string, unknown> = { organizationId }
  if (!filters.includeArchived) where.archivedAt = null
  if (filters.owner === "unassigned") where.ownerMembershipId = null
  else if (filters.owner) where.ownerMembershipId = filters.owner
  if (filters.industry || filters.focusOnly) {
    const companyWhere: Record<string, unknown> = {}
    if (filters.industry) companyWhere.industry = filters.industry
    if (filters.focusOnly) {
      companyWhere.id = { in: await getCurrentFocusCompanyIds(organizationId) }
    }
    where.company = companyWhere
  }

  const opps = await prisma.opportunity.findMany({
    where,
    orderBy: [{ company: { name: "asc" } }, { title: "asc" }],
    select: {
      title: true,
      estimatedValue: true,
      currency: true,
      probability: true,
      nextAction: true,
      expectedCloseDate: true,
      company: { select: { name: true } },
      stage: { select: { name: true } },
      owner: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
    },
  })

  return opps.map((o) => ({
    Firma: o.company.name,
    Başlık: o.title,
    Aşama: o.stage.name,
    Sorumlu: o.owner ? memberName(o.owner.profile) : "Atanmamış",
    "Tahmini Değer": o.estimatedValue ?? "",
    "Para Birimi": o.currency,
    "Olasılık (%)": o.probability ?? "",
    "Sonraki Aksiyon": o.nextAction ?? "",
    "Kapanış Tarihi": o.expectedCloseDate
      ? formatDate(o.expectedCloseDate)
      : "",
  }))
}

async function buildRows(
  type: ExportType,
  organizationId: string,
  filters: ExportRequest["filters"]
): Promise<Row[]> {
  if (type === "companies") return companyRows(organizationId, filters)
  if (type === "contacts") return contactRows(organizationId, filters)
  return opportunityRows(organizationId, filters)
}

export async function generateExport(
  input: ExportRequest
): Promise<ExportResult> {
  const parsed = exportRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    // Every role except VIEWER can export their own org's data.
    const membership = await requirePermission("data:export")
    const { type, format, filters } = parsed.data

    const rows = await buildRows(type, membership.organizationId, filters)
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `sponsorflow-${EXPORT_TYPE_LABELS[type].toLowerCase()}-${stamp}`

    if (format === "csv") {
      const csv = Papa.unparse(rows.length ? rows : [{ Bilgi: "Kayıt yok" }])
      const base64 = Buffer.from(String.fromCharCode(0xFEFF) + csv, "utf8").toString("base64")
      return {
        ok: true,
        fileName: `${base}.csv`,
        mime: "text/csv;charset=utf-8",
        base64,
        rows: rows.length,
      }
    }

    const XLSX = await import("xlsx")
    const sheet = XLSX.utils.json_to_sheet(
      rows.length ? rows : [{ Bilgi: "Kayıt yok" }]
    )
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, EXPORT_TYPE_LABELS[type])
    const base64 = XLSX.write(book, {
      type: "base64",
      bookType: "xlsx",
    }) as string

    return {
      ok: true,
      fileName: `${base}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64,
      rows: rows.length,
    }
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message || "Yetkin yok." }
    }
    console.error("generateExport", error)
    return { ok: false, error: GENERIC }
  }
}
