"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveIcon,
  Building2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { EmptyState } from "@/components/common/empty-state"
import { usePersistentStringSet } from "@/hooks/use-persistent-string-set"
import { formatDate } from "@/lib/format"
import {
  assignCompanyOwner,
  bulkAssignCompanyOwner,
} from "@/features/companies/actions"
import {
  CompanyFormSheet,
  type CompanyFormTarget,
} from "@/features/companies/components/company-form-sheet"
import { ArchiveCompanyDialog } from "@/features/companies/components/archive-company-dialog"
import { OwnerAssignPopover } from "@/features/companies/components/owner-assign-popover"
import { CompanyQuickViewSheet } from "@/features/companies/components/company-quick-view-sheet"
import type { CompanyRow, MemberOption } from "@/features/companies/queries"

type CompaniesViewProps = {
  companies: CompanyRow[]
  industries: string[]
  members: MemberOption[]
  filters: { q: string; industry: string; owner: string }
  can: {
    create: boolean
    update: boolean
    archive: boolean
    assign: boolean
    logActivity: boolean
  }
}

type ColKey = "industry" | "owner" | "source" | "location" | "updated"

const OPTIONAL_COLS: { key: ColKey; label: string }[] = [
  { key: "industry", label: "Sektör" },
  { key: "owner", label: "Sorumlu" },
  { key: "source", label: "Kaynak" },
  { key: "location", label: "Konum" },
  { key: "updated", label: "Güncellendi" },
]

const HIDDEN_COLS_KEY = "sponsorflow:companies:hidden-cols"

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"

export function CompaniesView({
  companies,
  industries,
  members,
  filters,
  can,
}: CompaniesViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startAssign] = useTransition()

  // Local copy so quick-assign updates are optimistic (no page refresh).
  const [rows, setRows] = useState(companies)
  const rowsSig = companies
    .map((c) => `${c.id}:${c.owner?.membershipId ?? ""}:${c.updatedAt.getTime()}`)
    .join("|")
  const [prevSig, setPrevSig] = useState(rowsSig)
  if (rowsSig !== prevSig) {
    setPrevSig(rowsSig)
    setRows(companies)
  }

  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("new") === "1"
  )
  const [editTarget, setEditTarget] = useState<CompanyFormTarget | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = usePersistentStringSet(HIDDEN_COLS_KEY)

  const toggleCol = useCallback(
    (key: ColKey) => {
      const next = new Set(hidden)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setHidden(next)
    },
    [hidden, setHidden]
  )

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete("new")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const onSearchChange = useCallback(
    (value: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => setParam("q", value.trim()), 300)
    },
    [setParam]
  )

  useEffect(() => {
    if (searchParams.get("new")) setParam("new", "")
  }, [searchParams, setParam])

  // Quick-view is local state (survives filter changes; no full nav needed).
  const [quickViewId, setQuickViewId] = useState<string | null>(
    () => searchParams.get("company")
  )
  function openQuickView(id: string) {
    setQuickViewId(id)
  }
  function closeQuickView() {
    setQuickViewId(null)
  }

  function applyAssign(companyId: string, membershipId: string | null) {
    const member = members.find((m) => m.membershipId === membershipId) ?? null
    const prev = rows
    setRows((r) =>
      r.map((c) =>
        c.id === companyId
          ? {
              ...c,
              owner: member
                ? { membershipId: member.membershipId, name: member.name }
                : null,
            }
          : c
      )
    )
    startAssign(async () => {
      const result = await assignCompanyOwner(companyId, membershipId)
      if (!result.ok) {
        setRows(prev)
        toast.error(result.error)
      }
    })
  }

  function applyBulkAssign(membershipId: string | null) {
    const ids = [...selected]
    const member = members.find((m) => m.membershipId === membershipId) ?? null
    const prev = rows
    setRows((r) =>
      r.map((c) =>
        selected.has(c.id)
          ? {
              ...c,
              owner: member
                ? { membershipId: member.membershipId, name: member.name }
                : null,
            }
          : c
      )
    )
    setSelected(new Set())
    startAssign(async () => {
      const result = await bulkAssignCompanyOwner(ids, membershipId)
      if (result.ok) {
        toast.success(`${result.count} firma güncellendi.`)
      } else {
        setRows(prev)
        toast.error(result.error)
      }
    })
  }

  const hasFilters = Boolean(filters.q || filters.industry || filters.owner)
  const allSelected = rows.length > 0 && selected.size === rows.length

  const show = (key: ColKey) => !hidden.has(key)

  function editTargetFromId(id: string): CompanyFormTarget | null {
    const c = rows.find((r) => r.id === id)
    return c
      ? {
          id: c.id,
          name: c.name,
          website: c.website,
          industry: c.industry,
          linkedinUrl: c.linkedinUrl,
          city: c.city,
          country: c.country,
          source: c.source,
          ownerMembershipId: c.owner?.membershipId ?? null,
        }
      : null
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            defaultValue={filters.q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Firma adına göre ara…"
            className="pl-8"
            aria-label="Firma ara"
          />
        </div>

        <select
          value={filters.industry}
          onChange={(e) => setParam("industry", e.target.value)}
          aria-label="Sektöre göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm sektörler</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <select
          value={filters.owner}
          onChange={(e) => setParam("owner", e.target.value)}
          aria-label="Sorumluya göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm sorumlular</option>
          {members.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.name}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Sütunlar">
              <SlidersHorizontalIcon />
              <span className="hidden sm:inline">Sütunlar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Görünür sütunlar</DropdownMenuLabel>
            {OPTIONAL_COLS.map((c) => (
              <DropdownMenuItem
                key={c.key}
                onSelect={(e) => {
                  e.preventDefault()
                  toggleCol(c.key)
                }}
              >
                <Checkbox checked={!hidden.has(c.key)} className="mr-1" />
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          {can.create ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Firma Ekle
            </Button>
          ) : null}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 ? (
        <div className="bg-brand-muted/60 animate-in fade-in-0 slide-in-from-top-1 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm duration-150">
          <span className="font-medium">{selected.size} firma seçildi</span>
          {can.assign ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  Sorumlu Ata
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1">
                <button
                  type="button"
                  onClick={() => applyBulkAssign(null)}
                  className="hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm"
                >
                  Atanmamış
                </button>
                {members.map((m) => (
                  <button
                    key={m.membershipId}
                    type="button"
                    onClick={() => applyBulkAssign(m.membershipId)}
                    className="hover:bg-muted w-full truncate rounded-md px-2 py-1.5 text-left text-sm"
                  >
                    {m.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            <XIcon />
            Seçimi temizle
          </Button>
        </div>
      ) : null}

      {/* Table */}
      {rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchIcon}
            title="Eşleşen firma yok."
            description="Filtreleri değiştirerek tekrar dene."
          />
        ) : (
          <EmptyState
            icon={Building2Icon}
            title="Henüz firma eklenmemiş."
            description="İlk firmayı ekleyerek sponsorluk sürecini başlat."
            action={
              can.create ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusIcon />
                  Firma Ekle
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background sticky top-0 z-10">
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="w-9 px-3 py-2">
                  <Checkbox
                    aria-label="Tümünü seç"
                    checked={allSelected}
                    onCheckedChange={(v) =>
                      setSelected(
                        v === true
                          ? new Set(rows.map((r) => r.id))
                          : new Set()
                      )
                    }
                  />
                </th>
                <th className="px-3 py-2 font-medium">Firma</th>
                {show("industry") ? (
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Sektör
                  </th>
                ) : null}
                {show("owner") ? (
                  <th className="px-3 py-2 font-medium">Sorumlu</th>
                ) : null}
                {show("source") ? (
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">
                    Kaynak
                  </th>
                ) : null}
                {show("location") ? (
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">
                    Konum
                  </th>
                ) : null}
                {show("updated") ? (
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Güncellendi
                  </th>
                ) : null}
                <th className="w-9 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((c) => {
                const isSel = selected.has(c.id)
                return (
                  <tr
                    key={c.id}
                    onClick={() => openQuickView(c.id)}
                    className={cn(
                      "hover:bg-muted/40 cursor-pointer transition-colors",
                      isSel && "bg-brand-muted/30"
                    )}
                  >
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        aria-label={`${c.name} seç`}
                        checked={isSel}
                        onCheckedChange={(v) =>
                          setSelected((s) => {
                            const next = new Set(s)
                            if (v === true) next.add(c.id)
                            else next.delete(c.id)
                            return next
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-medium">
                          {initials(c.name)}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {c.name}
                          </span>
                          {c.website || c.domain ? (
                            <span className="text-muted-foreground truncate text-xs">
                              {(c.domain || c.website || "").replace(
                                /^https?:\/\//,
                                ""
                              )}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    {show("industry") ? (
                      <td className="text-muted-foreground hidden max-w-40 truncate px-3 py-2 sm:table-cell">
                        {c.industry ?? "—"}
                      </td>
                    ) : null}
                    {show("owner") ? (
                      <td
                        className="px-3 py-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <OwnerAssignPopover
                          members={members}
                          currentMembershipId={c.owner?.membershipId ?? null}
                          currentName={c.owner?.name ?? null}
                          onAssign={(id) => applyAssign(c.id, id)}
                          disabled={!can.assign}
                        />
                      </td>
                    ) : null}
                    {show("source") ? (
                      <td className="text-muted-foreground hidden px-3 py-2 whitespace-nowrap lg:table-cell">
                        {c.source ?? "—"}
                      </td>
                    ) : null}
                    {show("location") ? (
                      <td className="text-muted-foreground hidden max-w-40 truncate px-3 py-2 lg:table-cell">
                        {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                      </td>
                    ) : null}
                    {show("updated") ? (
                      <td className="text-muted-foreground hidden px-3 py-2 tabular-nums whitespace-nowrap sm:table-cell">
                        {formatDate(c.updatedAt)}
                      </td>
                    ) : null}
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {can.update || can.archive ? (
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
                            <DropdownMenuItem
                              onSelect={() => openQuickView(c.id)}
                            >
                              <Building2Icon />
                              Hızlı görünüm
                            </DropdownMenuItem>
                            {can.update ? (
                              <DropdownMenuItem
                                onSelect={() =>
                                  setEditTarget(editTargetFromId(c.id))
                                }
                              >
                                <PencilIcon />
                                Düzenle
                              </DropdownMenuItem>
                            ) : null}
                            {can.assign ? (
                              <DropdownMenuItem
                                onSelect={() => openQuickView(c.id)}
                              >
                                Sorumluyu Değiştir
                              </DropdownMenuItem>
                            ) : null}
                            {can.archive ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() =>
                                    setArchiveTarget({
                                      id: c.id,
                                      name: c.name,
                                    })
                                  }
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

      <p className="text-muted-foreground text-xs">{rows.length} firma</p>

      {/* Quick view */}
      <CompanyQuickViewSheet
        companyId={quickViewId}
        onOpenChange={(o) => {
          if (!o) closeQuickView()
        }}
        members={members}
        canAssign={can.assign}
        canEdit={can.update}
        canLogActivity={can.logActivity}
        onEdit={(id) => {
          closeQuickView()
          setEditTarget(editTargetFromId(id))
        }}
      />

      {/* Create / edit */}
      <CompanyFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
      />
      <CompanyFormSheet
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
        members={members}
        company={editTarget}
      />
      <ArchiveCompanyDialog
        target={archiveTarget}
        onOpenChange={(o) => {
          if (!o) setArchiveTarget(null)
        }}
      />
    </div>
  )
}
