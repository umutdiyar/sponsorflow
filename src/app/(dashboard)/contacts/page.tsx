import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { hasPermission } from "@/lib/auth/permissions"
import { PageHeader } from "@/components/common/page-header"
import { getContactsPageData } from "@/features/contacts/queries"
import { ContactsView } from "@/features/contacts/components/contacts-view"

export const metadata: Metadata = { title: "Kişiler" }

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; company?: string }>
}) {
  const membership = await requirePermission("contact:read")
  const sp = await searchParams

  const { contacts, companies } = await getContactsPageData({
    organizationId: membership.organizationId,
    q: sp.q,
    companyId: sp.company,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Kişiler"
        description="Tüm firmalardaki iletişim kişilerinin birleşik listesi."
      />

      <ContactsView
        contacts={contacts}
        companies={companies}
        filters={{ q: sp.q ?? "", company: sp.company ?? "" }}
        can={{
          create: hasPermission(membership.role, "contact:create"),
          update: hasPermission(membership.role, "contact:update"),
          archive: hasPermission(membership.role, "contact:archive"),
        }}
      />
    </div>
  )
}
