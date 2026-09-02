import "server-only"

import { prisma } from "@/lib/db/prisma"

export type CompanyListSort =
  | "name"
  | "-name"
  | "updated"
  | "-updated"
  | "created"
  | "-created"

const SORT_MAP: Record<CompanyListSort, Record<string, "asc" | "desc">> = {
  name: { name: "asc" },
  "-name": { name: "desc" },
  updated: { updatedAt: "asc" },
  "-updated": { updatedAt: "desc" },
  created: { createdAt: "asc" },
  "-created": { createdAt: "desc" },
}

export type MemberOption = {
  membershipId: string
  name: string
}

export type CompanyRow = {
  id: string
  name: string
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  source: string | null
  city: string | null
  country: string | null
  updatedAt: Date
  owner: MemberOption | null
}

function memberName(profile: {
  fullName: string | null
  email: string
}): string {
  return profile.fullName?.trim() || profile.email
}

/** Members of an org, for owner selects/filters. Cheap projection. */
export async function listOrgMembers(
  organizationId: string
): Promise<MemberOption[]> {
  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId },
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return memberships.map((m) => ({
    membershipId: m.id,
    name: memberName(m.profile),
  }))
}

type ListCompaniesParams = {
  organizationId: string
  q?: string
  industry?: string
  ownerMembershipId?: string
  sort?: CompanyListSort
}

export async function listCompanies({
  organizationId,
  q,
  industry,
  ownerMembershipId,
  sort = "-updated",
}: ListCompaniesParams) {
  const trimmedQ = q?.trim()

  const rows = await prisma.company.findMany({
    where: {
      organizationId,
      archivedAt: null,
      ...(trimmedQ
        ? { name: { contains: trimmedQ, mode: "insensitive" } }
        : {}),
      ...(industry ? { industry } : {}),
      ...(ownerMembershipId ? { ownerMembershipId } : {}),
    },
    select: {
      id: true,
      name: true,
      website: true,
      linkedinUrl: true,
      industry: true,
      source: true,
      city: true,
      country: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true } },
        },
      },
    },
    orderBy: SORT_MAP[sort] ?? SORT_MAP["-updated"],
    take: 500,
  })

  const companies: CompanyRow[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    website: c.website,
    linkedinUrl: c.linkedinUrl,
    industry: c.industry,
    source: c.source,
    city: c.city,
    country: c.country,
    updatedAt: c.updatedAt,
    owner: c.owner
      ? { membershipId: c.owner.id, name: memberName(c.owner.profile) }
      : null,
  }))

  return companies
}

/**
 * Everything the /companies page needs, in one parallel round-trip:
 * the (filtered) list, the full set of industries for the filter, and the
 * org members for the owner filter/selects.
 */
export async function getCompaniesPageData(
  params: ListCompaniesParams
): Promise<{
  companies: CompanyRow[]
  industries: string[]
  members: MemberOption[]
}> {
  const [companies, industryRows, members] = await Promise.all([
    listCompanies(params),
    prisma.company.findMany({
      where: {
        organizationId: params.organizationId,
        archivedAt: null,
        NOT: { industry: null },
      },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    listOrgMembers(params.organizationId),
  ])

  return {
    companies,
    industries: industryRows
      .map((r) => r.industry)
      .filter((v): v is string => Boolean(v)),
    members,
  }
}

/**
 * Full company for the detail page, scoped to the org. Returns `null` when the
 * id belongs to another organization (IDOR guard — caller should `notFound()`).
 */
export async function getCompanyById(organizationId: string, id: string) {
  const company = await prisma.company.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      name: true,
      legalName: true,
      website: true,
      domain: true,
      industry: true,
      description: true,
      linkedinUrl: true,
      city: true,
      country: true,
      source: true,
      score: true,
      ownerMembershipId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true } },
        },
      },
      createdBy: {
        select: { profile: { select: { fullName: true, email: true } } },
      },
      contacts: {
        where: { archivedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
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
      },
    },
  })

  if (!company) return null

  return {
    ...company,
    ownerName: company.owner
      ? memberName(company.owner.profile)
      : null,
    createdByName: memberName(company.createdBy.profile),
  }
}

export type CompanyDetail = NonNullable<
  Awaited<ReturnType<typeof getCompanyById>>
>
