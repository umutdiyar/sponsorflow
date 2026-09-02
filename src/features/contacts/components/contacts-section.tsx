"use client"

import { useState } from "react"
import {
  MailIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/empty-state"
import { ContactFormSheet } from "@/features/contacts/components/contact-form-sheet"
import type { CreatedContact } from "@/features/contacts/actions"

export type ContactItem = {
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

type ContactsSectionProps = {
  companyId: string
  contacts: ContactItem[]
  canCreate: boolean
  onCreated: (contact: CreatedContact) => void
}

export function ContactsSection({
  companyId,
  contacts,
  canCreate,
  onCreated,
}: ContactsSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold">
          Kişiler{" "}
          <span className="text-muted-foreground font-normal">
            ({contacts.length})
          </span>
        </h2>
        {canCreate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <PlusIcon />
            Kişi Ekle
          </Button>
        ) : null}
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Bu firmaya henüz iletişim kişisi eklenmemiş."
          description="Karar vericileri ekleyerek görüşmeleri kişiselleştir."
          action={
            canCreate ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <PlusIcon />
                Kişi Ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-border overflow-hidden rounded-xl border">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1 p-4 text-sm not-last:border-b"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {c.firstName} {c.lastName}
                </span>
                {c.isPrimary ? (
                  <span className="bg-brand-muted text-brand-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                    <StarIcon className="size-3" />
                    Birincil
                  </span>
                ) : null}
              </div>
              {c.jobTitle || c.department ? (
                <span className="text-muted-foreground text-xs">
                  {[c.jobTitle, c.department].filter(Boolean).join(" · ")}
                </span>
              ) : null}
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="hover:text-foreground inline-flex items-center gap-1"
                  >
                    <MailIcon className="size-3.5" />
                    {c.email}
                  </a>
                ) : null}
                {c.phone ? (
                  <span className="inline-flex items-center gap-1">
                    <PhoneIcon className="size-3.5" />
                    {c.phone}
                  </span>
                ) : null}
              </div>
              {c.notes ? (
                <p className="text-muted-foreground mt-1 text-xs">{c.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ContactFormSheet
        companyId={companyId}
        open={open}
        onOpenChange={setOpen}
        onCreated={onCreated}
      />
    </div>
  )
}
