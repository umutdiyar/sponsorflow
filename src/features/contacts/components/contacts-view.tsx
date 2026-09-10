"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveIcon,
  Loader2Icon,
  MailIcon,
  MessageSquarePlusIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Share2Icon,
  StarIcon,
  UsersIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EmptyState } from "@/components/common/empty-state"
import { formatTimeAgo } from "@/lib/format"
import {
  archiveContact,
  createContact,
  updateContact,
} from "@/features/contacts/actions"
import {
  contactFormSchema,
  type ContactFormInput,
} from "@/features/contacts/schema"
import { ACTIVITY_CHANNEL_LABELS } from "@/features/activities/schema"
import { QuickLogCommunication } from "@/features/activities/components/activity-quick-add"
import { cn } from "@/lib/utils"
import {
  COMM_STATUS_LABELS,
  COMM_STATUSES,
  type CommStatus,
} from "@/features/activities/comm-status"
import type { ContactRow } from "@/features/contacts/queries"
import type { CompanyRef, MemberRef } from "@/lib/org/reference"

const CHANNEL_LABELS = ACTIVITY_CHANNEL_LABELS

const STATUS_TONE: Record<CommStatus, string> = {
  none: "bg-muted text-muted-foreground",
  contacted: "bg-muted text-foreground",
  replied: "bg-success/10 text-success",
  followup: "bg-destructive/10 text-destructive",
}

function CommStatusBadge({ status }: { status: CommStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_TONE[status]
      )}
    >
      {COMM_STATUS_LABELS[status]}
    </span>
  )
}

type Props = {
  contacts: ContactRow[]
  companies: CompanyRef[]
  members: MemberRef[]
  filters: { q: string; company: string; owner: string; status: string }
  can: {
    create: boolean
    update: boolean
    archive: boolean
    logActivity: boolean
  }
}

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"

export function ContactsView({
  contacts,
  companies,
  members,
  filters,
  can,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ContactRow | null>(null)
  const [logTarget, setLogTarget] = useState<ContactRow | null>(null)

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(
        () => setParam("q", value.trim()),
        300
      )
    },
    [setParam]
  )

  function onArchive(contact: ContactRow) {
    startTransition(async () => {
      const result = await archiveContact(contact.id)
      if (result.ok) {
        toast.success("Kişi arşivlendi.")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const hasFilters = Boolean(
    filters.q || filters.company || filters.owner || filters.status
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            defaultValue={filters.q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Kişi, e-posta veya firma ara…"
            className="pl-8"
            aria-label="Kişi ara"
          />
        </div>

        <select
          value={filters.company}
          onChange={(e) => setParam("company", e.target.value)}
          aria-label="Firmaya göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm firmalar</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(e) => setParam("owner", e.target.value)}
          aria-label="Firma sorumlusuna göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm sorumlular</option>
          <option value="unassigned">Atanmamış</option>
          {members.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="İletişim durumuna göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm durumlar</option>
          {COMM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {COMM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            Temizle
          </Button>
        ) : null}

        <div className="ml-auto">
          {can.create ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Kişi Ekle
            </Button>
          ) : null}
        </div>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={hasFilters ? SearchIcon : UsersIcon}
          title={
            hasFilters ? "Eşleşen kişi yok." : "Henüz kişi eklenmemiş."
          }
          description={
            hasFilters
              ? "Filtreleri değiştirerek tekrar dene."
              : "Firmalardaki karar vericileri ekleyerek görüşmeleri kişiselleştir."
          }
          action={
            can.create && !hasFilters ? (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                Kişi Ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background sticky top-0 z-10">
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-3 py-2 font-medium">Kişi</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">
                  Firma
                </th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">
                  Firma Sorumlusu
                </th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  İletişim
                </th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">
                  Son Temas
                </th>
                <th className="px-3 py-2 font-medium">Durum</th>
                <th className="w-8 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {contacts.map((c) => {
                return (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-medium">
                          {c.firstName} {c.lastName}
                          {c.isPrimary ? (
                            <StarIcon className="text-brand size-3.5" />
                          ) : null}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {[c.jobTitle, c.department]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                        <Link
                          href={`/companies/${c.companyId}`}
                          className="text-muted-foreground hover:text-foreground truncate text-xs hover:underline md:hidden"
                        >
                          {c.companyName}
                        </Link>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      <Link
                        href={`/companies/${c.companyId}`}
                        className="hover:text-foreground truncate hover:underline"
                      >
                        {c.companyName}
                      </Link>
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-2 whitespace-nowrap lg:table-cell">
                      {c.companyOwnerName ?? "—"}
                    </td>
                    <td className="hidden px-3 py-2 whitespace-nowrap sm:table-cell">
                      <div className="flex items-center gap-1">
                        {can.logActivity ? (
                          <button
                            type="button"
                            onClick={() => setLogTarget(c)}
                            aria-label={`${c.firstName} için iletişim kaydet`}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                          >
                            <MessageSquarePlusIcon className="size-3.5" />
                          </button>
                        ) : null}
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            aria-label={`${c.firstName} e-posta gönder`}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                          >
                            <MailIcon className="size-3.5" />
                          </a>
                        ) : null}
                        {c.linkedinUrl ? (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`${c.firstName} LinkedIn`}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                          >
                            <Share2Icon className="size-3.5" />
                          </a>
                        ) : null}
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            aria-label={`${c.firstName} ara`}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                          >
                            <PhoneIcon className="size-3.5" />
                          </a>
                        ) : null}
                        {!c.email &&
                        !c.linkedinUrl &&
                        !c.phone &&
                        !can.logActivity ? (
                          <span className="text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-muted-foreground hidden px-3 py-2 whitespace-nowrap lg:table-cell">
                      {c.lastContactAt ? (
                        <span>
                          {formatTimeAgo(c.lastContactAt)}
                          {c.lastContactChannel
                            ? ` · ${CHANNEL_LABELS[c.lastContactChannel]}`
                            : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <CommStatusBadge status={c.commStatus} />
                    </td>
                    <td className="px-3 py-2">
                    {can.update || can.archive || can.logActivity ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="İşlemler"
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {can.logActivity ? (
                            <DropdownMenuItem
                              onSelect={() => setLogTarget(c)}
                            >
                              <MessageSquarePlusIcon />
                              İletişim Kaydet
                            </DropdownMenuItem>
                          ) : null}
                          {can.logActivity && (can.update || can.archive) ? (
                            <DropdownMenuSeparator />
                          ) : null}
                          {can.update ? (
                            <DropdownMenuItem
                              onSelect={() => setEditTarget(c)}
                            >
                              <PencilIcon />
                              Düzenle
                            </DropdownMenuItem>
                          ) : null}
                          {can.archive ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => onArchive(c)}
                              >
                                <ArchiveIcon />
                                Arşivle
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">{contacts.length} kişi</p>

      <ContactSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        defaultCompanyId={filters.company || undefined}
        onDone={() => router.refresh()}
      />
      <ContactSheet
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
        companies={companies}
        contact={editTarget}
        onDone={() => router.refresh()}
      />

      {logTarget ? (
        <QuickLogCommunication
          open={logTarget !== null}
          onOpenChange={(o) => {
            if (!o) setLogTarget(null)
          }}
          companyId={logTarget.companyId}
          defaultContactId={logTarget.id}
          contacts={[
            {
              id: logTarget.id,
              name: `${logTarget.firstName} ${logTarget.lastName}`.trim(),
              email: logTarget.email,
              linkedinUrl: logTarget.linkedinUrl,
            },
          ]}
          onLogged={() => {
            setLogTarget(null)
            router.refresh()
          }}
        />
      ) : null}
    </div>
  )
}

function ContactSheet({
  open,
  onOpenChange,
  companies,
  contact,
  defaultCompanyId,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: CompanyRef[]
  contact?: ContactRow | null
  defaultCompanyId?: string
  onDone: () => void
}) {
  const isEdit = Boolean(contact)
  const [companyId, setCompanyId] = useState("")
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyContact(),
  })
  // eslint-disable-next-line react-hooks/incompatible-library
  const isPrimary = watch("isPrimary")

  useEffect(() => {
    if (!open) return
    setCompanyId(contact?.companyId ?? defaultCompanyId ?? "")
    reset(
      contact
        ? {
            firstName: contact.firstName,
            lastName: contact.lastName,
            jobTitle: contact.jobTitle ?? "",
            department: contact.department ?? "",
            email: contact.email ?? "",
            phone: contact.phone ?? "",
            linkedinUrl: contact.linkedinUrl ?? "",
            notes: contact.notes ?? "",
            isPrimary: contact.isPrimary,
          }
        : emptyContact()
    )
  }, [open, contact, defaultCompanyId, reset])

  const onSubmit = handleSubmit((values) => {
    if (!companyId) {
      toast.error("Firma seç.")
      return
    }
    startTransition(async () => {
      const result = isEdit
        ? await updateContact(contact!.id, values)
        : await createContact(companyId, values)
      if (result.ok) {
        toast.success(isEdit ? "Kişi güncellendi." : "Kişi eklendi.")
        onOpenChange(false)
        onDone()
      } else {
        toast.error(result.error)
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Kişiyi düzenle" : "Kişi ekle"}</SheetTitle>
          <SheetDescription>
            İletişim kişisinin bilgilerini {isEdit ? "güncelle" : "kaydet"}.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Firma<span className="text-destructive"> *</span>
              </span>
              <select
                className={selectClass + " w-full"}
                value={companyId}
                disabled={isEdit}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">Firma seç…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <CField label="Ad" required error={errors.firstName?.message}>
                <Input autoFocus {...register("firstName")} />
              </CField>
              <CField label="Soyad" required error={errors.lastName?.message}>
                <Input {...register("lastName")} />
              </CField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CField label="Pozisyon">
                <Input {...register("jobTitle")} />
              </CField>
              <CField label="Departman">
                <Input {...register("department")} />
              </CField>
            </div>

            <CField label="E-posta" error={errors.email?.message}>
              <Input inputMode="email" {...register("email")} />
            </CField>

            <div className="grid grid-cols-2 gap-3">
              <CField label="Telefon">
                <Input inputMode="tel" {...register("phone")} />
              </CField>
              <CField label="LinkedIn" error={errors.linkedinUrl?.message}>
                <Input inputMode="url" {...register("linkedinUrl")} />
              </CField>
            </div>

            <CField label="Notlar" error={errors.notes?.message}>
              <Textarea rows={3} {...register("notes")} />
            </CField>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPrimary === true}
                onCheckedChange={(v) => setValue("isPrimary", v === true)}
              />
              Birincil iletişim kişisi
            </label>
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <SheetClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Vazgeç
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Kaydet" : "Kişi Ekle"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function emptyContact(): ContactFormInput {
  return {
    firstName: "",
    lastName: "",
    jobTitle: "",
    department: "",
    email: "",
    phone: "",
    linkedinUrl: "",
    notes: "",
    isPrimary: false,
  }
}

function CField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </label>
  )
}
