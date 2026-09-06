"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { saveWeeklyFocus } from "@/features/weekly-focus/actions"
import type { CompanyRef } from "@/lib/org/reference"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: CompanyRef[]
  selectedIds: string[]
  targetCount: number | null
}

export function ManageFocusSheet({
  open,
  onOpenChange,
  companies,
  selectedIds,
  targetCount,
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds))
  const [target, setTarget] = useState(targetCount ? String(targetCount) : "")
  const [isPending, startTransition] = useTransition()

  // Reset local state each time the sheet opens.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery("")
      setPicked(new Set(selectedIds))
      setTarget(targetCount ? String(targetCount) : "")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr")
    const list = q
      ? companies.filter((c) => c.name.toLocaleLowerCase("tr").includes(q))
      : companies
    // Picked companies first for easy review.
    return [...list].sort(
      (a, b) =>
        Number(picked.has(b.id)) - Number(picked.has(a.id)) ||
        a.name.localeCompare(b.name, "tr")
    )
  }, [companies, query, picked])

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectVisible(n: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      for (const c of filtered.slice(0, n)) next.add(c.id)
      return next
    })
  }

  function onSubmit() {
    startTransition(async () => {
      const result = await saveWeeklyFocus({
        companyIds: [...picked],
        targetCompanyCount: target ? Number(target) : null,
      })
      if (result.ok) {
        toast.success("Haftalık odak güncellendi.")
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Bu haftanın odağı</SheetTitle>
          <SheetDescription>
            Bu hafta öncelik vereceğiniz firmaları seçin. İlerleme, kaydedilen
            iletişimlerden otomatik hesaplanır.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Hedef firma sayısı (opsiyonel)</span>
            <Input
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Örn. 20"
              className="w-32"
            />
          </label>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              Seçilen: {picked.size}
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectVisible(20)}
              >
                İlk 20&apos;yi seç
              </Button>
              {picked.size > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicked(new Set())}
                >
                  Temizle
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Firma ara…"
              className="pl-8"
            />
          </div>

          <div className="divide-border -mx-1 flex-1 divide-y overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-1 py-6 text-center text-sm">
                Firma bulunamadı.
              </p>
            ) : (
              filtered.map((c) => {
                const on = picked.has(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="hover:bg-muted flex w-full items-center gap-2.5 px-1 py-2 text-left text-sm"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        on
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-input"
                      )}
                    >
                      {on ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <SheetFooter className="flex-row justify-end border-t">
          <SheetClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </SheetClose>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Kaydet
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
