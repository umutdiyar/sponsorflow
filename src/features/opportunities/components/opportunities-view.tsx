"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon, TargetIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/common/empty-state"
import { formatDate, formatMoney, formatRelativeDay } from "@/lib/format"
import { StagePill } from "@/features/opportunities/components/stage-pill"
import { OpportunityFormSheet } from "@/features/opportunities/components/opportunity-form-sheet"
import type {
  OpportunityRow,
  OpportunityStatus,
} from "@/features/opportunities/queries"
import type {
  CompanyRef,
  MemberRef,
  PackageRef,
  StageRef,
} from "@/lib/org/reference"

const STATUS_OPTIONS: { value: OpportunityStatus; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "won", label: "Kazanıldı" },
  { value: "lost", label: "Kaybedildi" },
  { value: "archived", label: "Arşiv" },
  { value: "all", label: "Tümü" },
]

type Filters = {
  q: string
  stage: string
  owner: string
  package: string
  status: OpportunityStatus
}

type Props = {
  opportunities: OpportunityRow[]
  stages: StageRef[]
  members: MemberRef[]
  packages: PackageRef[]
  companies: CompanyRef[]
  filters: Filters
  canCreate: boolean
}

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"

export function OpportunitiesView({
  opportunities,
  stages,
  members,
  packages,
  companies,
  filters,
  canCreate,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("new") === "1"
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
      searchTimer.current = setTimeout(
        () => setParam("q", value.trim()),
        300
      )
    },
    [setParam]
  )

  useEffect(() => {
    if (searchParams.get("new")) setParam("new", "")
  }, [searchParams, setParam])

  const hasFilters = Boolean(
    filters.q ||
      filters.stage ||
      filters.owner ||
      filters.package ||
      (filters.status && filters.status !== "open")
  )

  const totalValue = useMemo(
    () =>
      opportunities.reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0),
    [opportunities]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            defaultValue={filters.q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Fırsat veya firma ara…"
            className="pl-8"
            aria-label="Fırsat ara"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="Duruma göre filtrele"
          className={selectClass}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.stage}
          onChange={(e) => setParam("stage", e.target.value)}
          aria-label="Aşamaya göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm aşamalar</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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

        <select
          value={filters.package}
          onChange={(e) => setParam("package", e.target.value)}
          aria-label="Pakete göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm paketler</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Fırsat Ekle
            </Button>
          ) : null}
        </div>
      </div>

      {opportunities.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchIcon}
            title="Eşleşen fırsat yok."
            description="Filtreleri değiştirerek tekrar dene."
          />
        ) : (
          <EmptyState
            icon={TargetIcon}
            title="Henüz fırsat oluşturulmamış."
            description="Bir firmayla ilk teması kurduğunda fırsat oluşturarak süreci başlat."
            action={
              canCreate ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <PlusIcon />
                  Fırsat Ekle
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-240 border-collapse text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-3 py-2 font-medium">Firma</th>
                <th className="px-3 py-2 font-medium">Fırsat</th>
                <th className="px-3 py-2 font-medium">Aşama</th>
                <th className="px-3 py-2 font-medium">Sorumlu</th>
                <th className="px-3 py-2 font-medium">Paket</th>
                <th className="px-3 py-2 text-right font-medium">
                  Tahmini Değer
                </th>
                <th className="px-3 py-2 font-medium">Sonraki Aksiyon</th>
                <th className="px-3 py-2 font-medium">Tarih</th>
                <th className="px-3 py-2 font-medium">Güncellendi</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {opportunities.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/companies/${o.companyId}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {o.companyName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/opportunities/${o.id}`}
                      className="font-medium hover:underline"
                    >
                      {o.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <StagePill name={o.stage.name} type={o.stage.type} />
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {o.owner?.name ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {o.packageName ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">
                    {o.estimatedValue != null
                      ? formatMoney(o.estimatedValue, o.currency)
                      : "—"}
                  </td>
                  <td className="text-muted-foreground max-w-56 truncate px-3 py-2.5">
                    {o.nextAction ?? "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                    {o.nextActionAt
                      ? formatRelativeDay(o.nextActionAt)
                      : "—"}
                  </td>
                  <td className="text-muted-foreground px-3 py-2.5 tabular-nums whitespace-nowrap">
                    {formatDate(o.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {opportunities.length} fırsat
        {totalValue > 0
          ? ` · ${formatMoney(totalValue, opportunities[0]?.currency ?? "TRY")} tahmini değer`
          : null}
      </p>

      <OpportunityFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        members={members}
        stages={stages}
        packages={packages}
        onSaved={(id) => router.push(`/opportunities/${id}`)}
      />
    </div>
  )
}
