"use client"

import { useState, useTransition } from "react"
import {
  ArchiveIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/common/empty-state"
import { formatMoney } from "@/lib/format"
import { archivePackage } from "@/features/packages/actions"
import { PackageFormSheet } from "@/features/packages/components/package-form-sheet"
import type { PackageRow } from "@/features/packages/queries"

type Props = {
  packages: PackageRow[]
  canCreate: boolean
  canUpdate: boolean
  canArchive: boolean
}

export function PackagesView({
  packages,
  canCreate,
  canUpdate,
  canArchive,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PackageRow | null>(null)
  const [, startTransition] = useTransition()

  function onArchive(pkg: PackageRow) {
    startTransition(async () => {
      const result = await archivePackage(pkg.id)
      if (result.ok) toast.success("Paket arşivlendi.")
      else toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Paket Ekle
          </Button>
        ) : null}
      </div>

      {packages.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Henüz paket tanımlanmamış."
          description="Altın, Gümüş ve ürün sponsoru gibi paketlerini tanımlayarak tekliflerini hızlandır."
          action={
            canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon />
                Paket Ekle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className={cn(
                "bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 text-sm ring-1",
                pkg.archivedAt && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-heading text-base font-medium">
                    {pkg.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {pkg.price != null
                      ? formatMoney(pkg.price, pkg.currency)
                      : "Fiyat belirtilmemiş"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!pkg.isActive || pkg.archivedAt ? (
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                      {pkg.archivedAt ? "Arşiv" : "Pasif"}
                    </span>
                  ) : null}
                  {canUpdate || canArchive ? (
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
                        {canUpdate ? (
                          <DropdownMenuItem
                            onSelect={() => setEditTarget(pkg)}
                          >
                            <PencilIcon />
                            Düzenle
                          </DropdownMenuItem>
                        ) : null}
                        {canArchive && !pkg.archivedAt ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => onArchive(pkg)}
                            >
                              <ArchiveIcon />
                              Arşivle
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>

              {pkg.description ? (
                <p className="text-muted-foreground">{pkg.description}</p>
              ) : null}

              {pkg.benefits.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {pkg.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <CheckIcon className="text-success mt-0.5 size-3 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="text-muted-foreground mt-auto text-xs">
                {pkg.opportunityCount} fırsatta kullanılıyor
              </p>
            </li>
          ))}
        </ul>
      )}

      <PackageFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      <PackageFormSheet
        open={editTarget !== null}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null)
        }}
        pkg={editTarget}
      />
    </div>
  )
}
