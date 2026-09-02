"use client"

import { useCallback, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ActivityTimeline } from "@/features/activities/components/activity-timeline"
import {
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
} from "@/features/activities/schema"
import { fetchActivityPage } from "@/features/activities/actions"
import type { ActivityListItem } from "@/features/activities/queries"
import type { MemberRef, CompanyRef } from "@/lib/org/reference"

type Filters = {
  type: string
  member: string
  company: string
  from: string
  to: string
}

type Props = {
  initialItems: ActivityListItem[]
  initialCursor: string | null
  filters: Filters
  members: MemberRef[]
  companies: CompanyRef[]
}

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none"

export function ActivitiesFeed({
  initialItems,
  initialCursor,
  filters,
  members,
  companies,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [isLoading, startLoading] = useTransition()

  // Reset local state whenever the server sends a fresh first page.
  const stateKey = initialItems.map((i) => i.id).join(",")
  const [seenKey, setSeenKey] = useState(stateKey)
  if (seenKey !== stateKey) {
    setSeenKey(stateKey)
    setItems(initialItems)
    setCursor(initialCursor)
  }

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const hasFilters = Boolean(
    filters.type ||
      filters.member ||
      filters.company ||
      filters.from ||
      filters.to
  )

  function loadMore() {
    if (!cursor) return
    startLoading(async () => {
      const result = await fetchActivityPage({
        type: filters.type || undefined,
        memberId: filters.member || undefined,
        companyId: filters.company || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        cursor,
      }).catch(() => null)
      if (!result) {
        toast.error("Daha fazla aktivite yüklenemedi.")
        return
      }
      setItems((prev) => [...prev, ...result.items])
      setCursor(result.nextCursor)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.type}
          onChange={(e) => setParam("type", e.target.value)}
          aria-label="Türe göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm türler</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select
          value={filters.member}
          onChange={(e) => setParam("member", e.target.value)}
          aria-label="Kişiye göre filtrele"
          className={selectClass}
        >
          <option value="">Tüm ekip</option>
          {members.map((m) => (
            <option key={m.membershipId} value={m.membershipId}>
              {m.name}
            </option>
          ))}
        </select>

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

        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          Başlangıç
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setParam("from", e.target.value)}
            className={selectClass}
          />
        </label>
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
          Bitiş
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setParam("to", e.target.value)}
            className={selectClass}
          />
        </label>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.replace(pathname, { scroll: false })}
          >
            Temizle
          </Button>
        ) : null}
      </div>

      <ActivityTimeline
        activities={items}
        showContext
        emptyTitle={
          hasFilters
            ? "Filtrelere uyan aktivite yok."
            : "Henüz aktivite kaydı yok."
        }
        emptyDescription={
          hasFilters
            ? "Filtreleri değiştirerek tekrar dene."
            : "Ekip bir görüşme veya not eklediğinde burada görünecek."
        }
      />

      {cursor ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? <Loader2Icon className="animate-spin" /> : null}
            Daha fazla yükle
          </Button>
        </div>
      ) : null}
    </div>
  )
}
