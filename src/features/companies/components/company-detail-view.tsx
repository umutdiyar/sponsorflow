"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  PencilIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import {
  CompanyFormSheet,
  type CompanyFormTarget,
} from "@/features/companies/components/company-form-sheet"
import { ArchiveCompanyDialog } from "@/features/companies/components/archive-company-dialog"
import {
  ContactsSection,
  type ContactItem,
} from "@/features/contacts/components/contacts-section"
import type { CompanyDetail, MemberOption } from "@/features/companies/queries"

type CompanyDetailViewProps = {
  company: CompanyDetail & { ownerName: string | null; createdByName: string }
  members: MemberOption[]
  can: { update: boolean; archive: boolean; createContact: boolean }
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
})

export function CompanyDetailView({
  company,
  members,
  can,
}: CompanyDetailViewProps) {
  const [tab, setTab] = useState<string>("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  // Contacts update locally on create so the active tab / scroll aren't lost.
  const [contacts, setContacts] = useState<ContactItem[]>(company.contacts)

  const target: CompanyFormTarget = {
    id: company.id,
    name: company.name,
    website: company.website,
    industry: company.industry,
    linkedinUrl: company.linkedinUrl,
    city: company.city,
    country: company.country,
    source: company.source,
    ownerMembershipId: company.ownerMembershipId,
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <Link
        href="/companies"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon className="size-4" />
        Firmalar
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {company.name}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {company.industry ? <span>{company.industry}</span> : null}
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground inline-flex items-center gap-1"
              >
                {company.website.replace(/^https?:\/\//, "")}
                <ExternalLinkIcon className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {can.update ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <PencilIcon />
              Düzenle
            </Button>
          ) : null}
          {can.archive ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setArchiveOpen(true)}
            >
              <ArchiveIcon />
              Arşivle
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="contacts">
            Kişiler ({contacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Panel>
            <PanelHeader title="Firma bilgileri" />
            <PanelContent className="divide-border grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
              <Row label="Sektör" value={company.industry} />
              <Row label="Sorumlu" value={company.ownerName ?? "Atanmamış"} />
              <Row label="Kaynak" value={company.source} />
              <Row
                label="Konum"
                value={
                  [company.city, company.country].filter(Boolean).join(", ") ||
                  null
                }
              />
              <Row
                label="LinkedIn"
                value={company.linkedinUrl}
                href={company.linkedinUrl ?? undefined}
              />
              <Row label="Ekleyen" value={company.createdByName} />
              <Row
                label="Oluşturuldu"
                value={dateFmt.format(company.createdAt)}
              />
              <Row
                label="Güncellendi"
                value={dateFmt.format(company.updatedAt)}
              />
            </PanelContent>
          </Panel>
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsSection
            companyId={company.id}
            contacts={contacts}
            canCreate={can.createContact}
            onCreated={(contact) =>
              setContacts((prev) => {
                const next = contact.isPrimary
                  ? prev.map((c) => ({ ...c, isPrimary: false }))
                  : prev
                return [contact, ...next].sort(
                  (a, b) => Number(b.isPrimary) - Number(a.isPrimary)
                )
              })
            }
          />
        </TabsContent>
      </Tabs>

      <CompanyFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        members={members}
        company={target}
      />
      <ArchiveCompanyDialog
        target={archiveOpen ? { id: company.id, name: company.name } : null}
        onOpenChange={setArchiveOpen}
        redirectTo="/companies"
      />
    </div>
  )
}

function Row({
  label,
  value,
  href,
}: {
  label: string
  value: string | null
  href?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 text-sm last:border-b-0 sm:nth-last-2:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="max-w-[60%] truncate font-medium hover:underline"
          >
            {value.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="max-w-[60%] truncate font-medium">{value}</span>
        )
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  )
}
