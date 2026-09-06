"use client"

import { useState, useTransition } from "react"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { generateExport } from "@/features/export/actions"
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  EXPORT_TYPES,
  EXPORT_TYPE_LABELS,
  type ExportFormat,
  type ExportType,
} from "@/features/export/schema"

type MemberOption = { membershipId: string; name: string }

type Props = {
  members: MemberOption[]
  industries: string[]
  hasFocus: boolean
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

function triggerDownload(base64: string, mime: string, fileName: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ExportPanel({ members, industries, hasFocus }: Props) {
  const [type, setType] = useState<ExportType>("companies")
  const [format, setFormat] = useState<ExportFormat>("xlsx")
  const [owner, setOwner] = useState("")
  const [industry, setIndustry] = useState("")
  const [focusOnly, setFocusOnly] = useState(false)
  const [includeArchived, setIncludeArchived] = useState(false)
  const [isPending, startTransition] = useTransition()

  const showArchived = type !== "contacts"

  function onExport() {
    startTransition(async () => {
      const result = await generateExport({
        type,
        format,
        filters: {
          owner: owner || undefined,
          industry: industry || undefined,
          focusOnly: focusOnly || undefined,
          includeArchived: showArchived ? includeArchived || undefined : undefined,
        },
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      triggerDownload(result.base64, result.mime, result.fileName)
      toast.success(
        result.rows > 0
          ? `${result.rows} kayıt dışa aktarıldı.`
          : "Eşleşen kayıt yok — boş dosya indirildi."
      )
    })
  }

  return (
    <Panel>
      <PanelHeader
        title="Dışa aktar"
        description="Seçtiğin veriyi CSV veya Excel olarak indir."
      />
      <PanelContent className="flex flex-col gap-5">
        <Group label="Veri türü">
          <div className="flex flex-wrap gap-2">
            {EXPORT_TYPES.map((t) => (
              <Chip
                key={t}
                active={type === t}
                onClick={() => setType(t)}
                label={EXPORT_TYPE_LABELS[t]}
              />
            ))}
          </div>
        </Group>

        <Group label="Format">
          <div className="flex flex-wrap gap-2">
            {EXPORT_FORMATS.map((f) => (
              <Chip
                key={f}
                active={format === f}
                onClick={() => setFormat(f)}
                label={EXPORT_FORMAT_LABELS[f]}
              />
            ))}
          </div>
        </Group>

        <Group label="Filtreler">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Sorumlu</span>
              <select
                className={selectClass}
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              >
                <option value="">Tümü</option>
                <option value="unassigned">Atanmamış</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground text-xs">Sektör</span>
              <select
                className={selectClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Tümü</option>
                {industries.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {hasFocus ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={focusOnly}
                  onChange={(e) => setFocusOnly(e.target.checked)}
                />
                Yalnızca bu haftanın odağındaki firmalar
              </label>
            ) : null}
            {showArchived ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Arşivlenmiş kayıtları da dahil et
              </label>
            ) : null}
          </div>
        </Group>

        <div className="border-t pt-4">
          <Button onClick={onExport} disabled={isPending}>
            {isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            Dışa Aktar
          </Button>
        </div>
      </PanelContent>
    </Panel>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand bg-brand-muted text-brand-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}
