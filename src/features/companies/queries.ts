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
  domain: string | null
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
      domain: true,
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
    domain: c.domain,
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

export type CompanyQuickView = {
  id: string
  name: string
  website: string | null
  linkedinUrl: string | null
  industry: string | null
  source: string | null
  city: string | null
  country: string | null
  owner: MemberOption | null
  contacts: {
    id: string
    name: string
    jobTitle: string | null
    email: string | null
    linkedinUrl: string | null
    isPrimary: boolean
  }[]
  opportunities: {
    id: string
    title: string
    stageName: string
    stageType: "OPEN" | "WON" | "LOST"
    estimatedValue: number | null
    currency: string
  }[]
  activities: {
    id: string
    channel: string
    kind: string
    direction: string
    title: string | null
    description: string | null
    occurredAt: Date
    author: string
    contactName: string | null
  }[]
}

/**
 * On-demand payload for the company quick-view Sheet — the list itself stays
 * lightweight and this only runs when a row is opened.
 */
export async function getCompanyQuickView(
  organizationId: string,
  companyId: string
): Promise<CompanyQuickView | null> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, organizationId },
    select: {
      id: true,
      name: true,
      website: true,
      linkedinUrl: true,
      industry: true,
      source: true,
      city: true,
      country: true,
      owner: {
        select: {
          id: true,
          profile: { select: { fullName: true, email: true } },
        },
      },
    },
  })
  if (!company) return null

  const [contacts, opportunities, activities] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId, companyId, archivedAt: null },
      orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
      take: 20,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        email: true,
        linkedinUrl: true,
        isPrimary: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { organizationId, companyId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        estimatedValue: true,
        currency: true,
        stage: { select: { name: true, type: true } },
      },
    }),
    prisma.activity.findMany({
      where: { organizationId, companyId },
      orderBy: [{ occurredAt: "desc" }],
      take: 8,
      select: {
        id: true,
        channel: true,
        kind: true,
        direction: true,
        title: true,
        description: true,
        occurredAt: true,
        contact: { select: { firstName: true, lastName: true } },
        createdBy: {
          select: { profile: { select: { fullName: true, email: true } } },
        },
      },
    }),
  ])

  return {
    id: company.id,
    name: company.name,
    website: company.website,
    linkedinUrl: company.linkedinUrl,
    industry: company.industry,
    source: company.source,
    city: company.city,
    country: company.country,
    owner: company.owner
      ? { membershipId: company.owner.id, name: memberName(company.owner.profile) }
      : null,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      jobTitle: c.jobTitle,
      email: c.email,
      linkedinUrl: c.linkedinUrl,
      isPrimary: c.isPrimary,
    })),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      stageName: o.stage.name,
      stageType: o.stage.type,
      estimatedValue: o.estimatedValue,
      currency: o.currency,
    })),
    activities: activities.map((a) => ({
      id: a.id,
      channel: a.channel,
      kind: a.kind,
      direction: a.direction,
      title: a.title,
      description: a.description,
      occurredAt: a.occurredAt,
      author: memberName(a.createdBy.profile),
      contactName: a.contact
        ? `${a.contact.firstName} ${a.contact.lastName}`.trim()
        : null,
    })),
  }
}
