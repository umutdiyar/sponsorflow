"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowUpDownIcon,
  Building2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  ArchiveIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/common/empty-state"
import {
  CompanyFormSheet,
  type CompanyFormTarget,
} from "@/features/companies/components/company-form-sheet"
import { ArchiveCompanyDialog } from "@/features/companies/components/archive-company-dialog"
import type { CompanyRow, MemberOption } from "@/features/companies/queries"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

type CompaniesViewProps = {
  companies: CompanyRow[]
  industries: string[]
  members: MemberOption[]
  filters: { q: string; industry: string; owner: string }
  can: { create: boolean; update: boolean; archive: boolean }
}

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

  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])
  // Header "Hızlı İşlem → Firma Ekle" deep-links here with ?new=1.
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("new") === "1"
  )
  const [editTarget, setEditTarget] = useState<CompanyFormTarget | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string
    name: string
  } | null>(null)

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
      searchTimer.current = setTimeout(() => setParam("q", value.trim()), 300)
    },
    [setParam]
  )

  // Drop the one-shot ?new=1 from the URL once the sheet has opened.
  useEffect(() => {
    if (searchParams.get("new")) setParam("new", "")
  }, [searchParams, setParam])

  const columns = useMemo<ColumnDef<CompanyRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Firma",
        cell: ({ row }) => (
          <Link
            href={`/companies/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "industry",
        header: "Sektör",
        cell: ({ getValue }) => textOrDash(getValue<string | null>()),
      },
      {
        id: "owner",
        accessorFn: (row) => row.owner?.name ?? "",
        header: "Sorumlu",
        cell: ({ row }) =>
          row.original.owner ? (
            row.original.owner.name
          ) : (
            <span className="text-muted-foreground">Atanmamış</span>
          ),
      },
      {
        accessorKey: "source",
        header: "Kaynak",
        cell: ({ getValue }) => textOrDash(getValue<string | null>()),
      },
      {
        id: "location",
        accessorFn: (row) =>
          [row.city, row.country].filter(Boolean).join(", "),
        header: "Konum",
        cell: ({ getValue }) => textOrDash(getValue<string>()),
      },
      {
        accessorKey: "updatedAt",
        header: "Güncellendi",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground tabular-nums">
            {dateFmt.format(getValue<Date>())}
          </span>
        ),
      },
      ...(can.update || can.archive
        ? [
            {
              id: "actions",
              header: "",
              enableSorting: false,
              cell: ({ row }: { row: { original: CompanyRow } }) => (
                <div className="flex justify-end">
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
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild>
                        <Link href={`/companies/${row.original.id}`}>
                          <Building2Icon />
                          Görüntüle
                        </Link>
                      </DropdownMenuItem>
                      {can.update ? (
                        <DropdownMenuItem
                          onSelect={() =>
                            setEditTarget(toFormTarget(row.original))
                          }
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
                            onSelect={() =>
                              setArchiveTarget({
                                id: row.original.id,
                                name: row.original.name,
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
                </div>
              ),
            } satisfies ColumnDef<CompanyRow>,
          ]
        : []),
    ],
    [can.update, can.archive]
  )

  // React Compiler can't memoize TanStack Table's returned functions; harmless
  // here (compiler isn't enabled) and the table manages its own memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const hasFilters = Boolean(
    filters.q || filters.industry || filters.owner
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
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
          className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"
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
          className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"
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

        <div className="ml-auto">
          {can.create ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Firma Ekle
            </Button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      {companies.length === 0 ? (
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
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    return (
                      <th
                        key={header.id}
                        className="text-muted-foreground px-3 py-2 text-left text-xs font-medium"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="hover:text-foreground inline-flex items-center gap-1"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            <ArrowUpDownIcon
                              className={cn(
                                "size-3",
                                header.column.getIsSorted()
                                  ? "text-foreground"
                                  : "opacity-40"
                              )}
                            />
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-border divide-y">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {companies.length} firma
      </p>

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

function textOrDash(value: string | null | undefined) {
  return value ? (
    value
  ) : (
    <span className="text-muted-foreground">—</span>
  )
}

function toFormTarget(row: CompanyRow): CompanyFormTarget {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    industry: row.industry,
    linkedinUrl: row.linkedinUrl,
    city: row.city,
    country: row.country,
    source: row.source,
    ownerMembershipId: row.owner?.membershipId ?? null,
  }
}
