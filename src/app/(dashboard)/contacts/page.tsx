import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import {
  getContactsPageData,
  CONTACT_COMM_STATUSES,
} from "@/features/contacts/queries"
import { ContactsView } from "@/features/contacts/components/contacts-view"

export const metadata: Metadata = { title: "Kişiler" }

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    company?: string
    owner?: string
    status?: string
  }>
}) {
  const membership = await requirePermission("contact:read")
  const sp = await searchParams

  const status =
    sp.status && (CONTACT_COMM_STATUSES as readonly string[]).includes(sp.status)
      ? sp.status
      : ""

  const { contacts, companies, members } = await getContactsPageData({
    organizationId: membership.organizationId,
    q: sp.q,
    companyId: sp.company,
    owner: sp.owner,
    commStatus: status || undefined,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Kişiler"
        description="Tüm firmalardaki iletişim kişileri ve iletişim durumları."
      />

      <ContactsView
        contacts={contacts}
        companies={companies}
        members={members}
        filters={{
          q: sp.q ?? "",
          company: sp.company ?? "",
          owner: sp.owner ?? "",
          status,
        }}
        can={{
          create: hasPermission(membership.role, "contact:create"),
          update: hasPermission(membership.role, "contact:update"),
          archive: hasPermission(membership.role, "contact:archive"),
          logActivity: hasPermission(membership.role, "activity:create"),
        }}
      />
    </div>
  )
}
