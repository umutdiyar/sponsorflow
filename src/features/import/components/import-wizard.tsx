"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import {
  IMPORT_FIELDS,
  autoMap,
  type ImportFieldKey,
} from "@/features/import/fields"
import {
  DUPLICATE_STRATEGY_LABELS,
  DUPLICATE_STRATEGIES,
  ROW_STATUS_LABELS,
  type DuplicateStrategy,
  type ImportAnalysis,
  type ImportOutcome,
  type ImportRow,
  type RowStatus,
} from "@/features/import/schema"
import {
  analyzeCompanyImport,
  runCompanyImport,
} from "@/features/import/actions"

const MAX_ROWS = 1000

type Step = "upload" | "map" | "review" | "done"

type Parsed = {
  fileName: string
  headers: string[]
  rows: string[][]
  truncated: boolean
}

const STATUS_TONE: Record<RowStatus, string> = {
  valid: "bg-success/10 text-success",
  missing: "bg-warning/15 text-warning-foreground",
  duplicate: "bg-warning/15 text-warning-foreground",
  error: "bg-destructive/10 text-destructive",
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

async function parseFile(file: File): Promise<Parsed> {
  const name = file.name
  const isExcel = /\.xlsx?$/i.test(name)

  let matrix: string[][]
  if (isExcel) {
    const XLSX = await import("xlsx")
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    })
  } else {
    const mod = await import("papaparse")
    const Papa = mod.default ?? mod
    const text = await file.text()
    const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" })
    matrix = result.data
  }

  const cleaned = matrix
    .map((r) => r.map((c) => String(c ?? "").trim()))
    .filter((r) => r.some((c) => c !== ""))

  if (cleaned.length === 0) {
    throw new Error("Dosyada satır bulunamadı.")
  }

  const headers = cleaned[0]
  const body = cleaned.slice(1)
  return {
    fileName: name,
    headers,
    rows: body.slice(0, MAX_ROWS),
    truncated: body.length > MAX_ROWS,
  }
}

export function ImportWizard() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ImportFieldKey, number>>>(
    {}
  )
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip")
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [parsing, setParsing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const nameMapped = mapping.name != null

  const mappedRows = useMemo<ImportRow[]>(() => {
    if (!parsed) return []
    return parsed.rows.map((cells) => {
      const row: Record<string, string | undefined> = {}
      for (const field of IMPORT_FIELDS) {
        const idx = mapping[field.key]
        if (idx != null) row[field.key] = cells[idx] ?? ""
      }
      return row as ImportRow
    })
  }, [parsed, mapping])

  async function onFile(file: File | undefined) {
    if (!file) return
    setParsing(true)
    try {
      const result = await parseFile(file)
      setParsed(result)
      setMapping(autoMap(result.headers))
      setStep("map")
      if (result.truncated) {
        toast.warning(
          `Dosyada ${MAX_ROWS}+ satır var. İlk ${MAX_ROWS} satır alınacak.`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Dosya okunamadı."
      )
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function onAnalyze() {
    if (!parsed || !nameMapped) return
    startTransition(async () => {
      const result = await analyzeCompanyImport({
        fileName: parsed.fileName,
        duplicateStrategy: strategy,
        rows: mappedRows,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setAnalysis(result.analysis)
      setStep("review")
    })
  }

  function onImport() {
    if (!parsed) return
    startTransition(async () => {
      const result = await runCompanyImport({
        fileName: parsed.fileName,
        duplicateStrategy: strategy,
        rows: mappedRows,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setOutcome(result.outcome)
      setStep("done")
      router.refresh()
    })
  }

  function reset() {
    setParsed(null)
    setMapping({})
    setAnalysis(null)
    setOutcome(null)
    setStrategy("skip")
    setStep("upload")
  }

  return (
    <Panel>
      <PanelHeader
        title="Firma içe aktarma"
        description={STEP_HINT[step]}
      />
      <PanelContent className="flex flex-col gap-5">
        <Stepper step={step} />

        {step === "upload" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="bg-muted text-muted-foreground rounded-full p-3">
              <FileSpreadsheetIcon className="size-6" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                CSV veya Excel dosyası seç
              </p>
              <p className="text-muted-foreground text-xs">
                İlk satır başlık olmalı. En fazla {MAX_ROWS} satır.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <UploadIcon />
              )}
              Dosya Seç
            </Button>
          </div>
        ) : null}

        {step === "map" && parsed ? (
          <MapStep
            parsed={parsed}
            mapping={mapping}
            onChange={setMapping}
          />
        ) : null}

        {step === "review" && analysis ? (
          <ReviewStep
            analysis={analysis}
            strategy={strategy}
            onStrategyChange={setStrategy}
          />
        ) : null}

        {step === "done" && outcome ? (
          <DoneStep outcome={outcome} />
        ) : null}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t pt-4">
          {step === "map" ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeftIcon />
              Baştan
            </Button>
          ) : step === "review" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("map")}
              disabled={isPending}
            >
              <ArrowLeftIcon />
              Eşleştirmeye dön
            </Button>
          ) : (
            <span />
          )}

          {step === "map" ? (
            <Button onClick={onAnalyze} disabled={!nameMapped || isPending}>
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Önizle
            </Button>
          ) : null}
          {step === "review" && analysis ? (
            <Button
              onClick={onImport}
              disabled={isPending || importableCount(analysis, strategy) === 0}
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              {importableCount(analysis, strategy)} firmayı içe aktar
            </Button>
          ) : null}
          {step === "done" ? (
            <Button onClick={reset}>Yeni içe aktarma</Button>
          ) : null}
        </div>
      </PanelContent>
    </Panel>
  )
}

const STEP_HINT: Record<Step, string> = {
  upload: "Firma listesini bir dosyadan aktar.",
  map: "Dosyadaki kolonları SponsorFlow alanlarıyla eşleştir.",
  review: "İçe aktarmadan önce satırları ve tekrar eden kayıtları kontrol et.",
  done: "İçe aktarma tamamlandı.",
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Dosya" },
    { key: "map", label: "Eşleştir" },
    { key: "review", label: "Önizle" },
    { key: "done", label: "Sonuç" },
  ]
  const activeIdx = steps.findIndex((s) => s.key === step)
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border text-[0.6875rem] font-semibold",
              i < activeIdx && "border-brand bg-brand text-brand-foreground",
              i === activeIdx && "border-brand text-brand-foreground",
              i > activeIdx && "border-border text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              i === activeIdx ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 ? (
            <span className="bg-border h-px w-6" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function MapStep({
  parsed,
  mapping,
  onChange,
}: {
  parsed: Parsed
  mapping: Partial<Record<ImportFieldKey, number>>
  onChange: (m: Partial<Record<ImportFieldKey, number>>) => void
}) {
  function set(key: ImportFieldKey, value: string) {
    const next = { ...mapping }
    if (value === "") delete next[key]
    else next[key] = Number(value)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {IMPORT_FIELDS.map((field) => {
          const value = mapping[field.key]
          const preview =
            value != null ? parsed.rows[0]?.[value]?.slice(0, 40) : null
          return (
            <label key={field.key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                {field.label}
                {field.required ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </span>
              <select
                className={selectClass}
                value={value ?? ""}
                onChange={(e) => set(field.key, e.target.value)}
              >
                <option value="">— eşleştirilmedi —</option>
                {parsed.headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Kolon ${i + 1}`}
                  </option>
                ))}
              </select>
              {preview ? (
                <span className="text-muted-foreground truncate text-xs">
                  Örnek: {preview}
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
      {mapping.name == null ? (
        <p className="text-destructive text-xs">
          İçe aktarmak için en az “Firma Adı” eşleştirilmeli.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {parsed.rows.length} satır okundu. Eşleştirilmeyen kolonlar atlanır.
        </p>
      )}
    </div>
  )
}

function ReviewStep({
  analysis,
  strategy,
  onStrategyChange,
}: {
  analysis: ImportAnalysis
  strategy: DuplicateStrategy
  onStrategyChange: (s: DuplicateStrategy) => void
}) {
  const { counts } = analysis
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={ROW_STATUS_LABELS.valid} value={counts.valid} tone="text-success" />
        <Stat
          label={ROW_STATUS_LABELS.duplicate}
          value={counts.duplicate}
          tone="text-warning-foreground"
        />
        <Stat
          label={ROW_STATUS_LABELS.missing}
          value={counts.missing}
          tone="text-warning-foreground"
        />
        <Stat
          label={ROW_STATUS_LABELS.error}
          value={counts.error}
          tone="text-destructive"
        />
      </div>

      {counts.duplicate > 0 ? (
        <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-sm font-medium">
            Tekrar eden {counts.duplicate} kayıt için ne yapılsın?
          </p>
          <div className="flex flex-wrap gap-2">
            {DUPLICATE_STRATEGIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStrategyChange(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  strategy === s
                    ? "border-brand bg-brand-muted text-brand-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {DUPLICATE_STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {strategy === "skip"
              ? "Tekrar eden satırlar atlanır (önerilen)."
              : strategy === "update"
                ? "Mevcut firmaların boş alanları dosyadaki değerlerle güncellenir."
                : "Her satır için yeni firma oluşturulur."}
          </p>
        </div>
      ) : null}

      {analysis.unknownOwners.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Eşleşmeyen sorumlu: {analysis.unknownOwners.join(", ")} — bu firmalar
          “atanmamış” olarak aktarılır.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Firma</th>
              <th className="px-3 py-2 font-medium">Durum</th>
              <th className="px-3 py-2 font-medium">Not</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {analysis.rows.slice(0, 50).map((r) => (
              <tr key={r.index}>
                <td className="text-muted-foreground px-3 py-1.5 tabular-nums">
                  {r.index + 1}
                </td>
                <td className="px-3 py-1.5">{r.name ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_TONE[r.status]
                    )}
                  >
                    {ROW_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="text-muted-foreground px-3 py-1.5 text-xs">
                  {r.message ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {analysis.rows.length > 50 ? (
          <p className="text-muted-foreground px-3 py-2 text-xs">
            İlk 50 satır gösteriliyor. Toplam {analysis.rows.length}.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function DoneStep({ outcome }: { outcome: ImportOutcome }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="bg-success/10 text-success rounded-full p-3">
        <CheckCircle2Icon className="size-6" />
      </div>
      <p className="text-sm font-medium">İçe aktarma tamamlandı</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Eklendi" value={outcome.importedRows} tone="text-success" />
        <Stat label="Güncellendi" value={outcome.updatedRows} />
        <Stat label="Atlandı" value={outcome.skippedRows} />
        <Stat
          label="Hatalı"
          value={outcome.failedRows}
          tone={outcome.failedRows > 0 ? "text-destructive" : undefined}
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: string
}) {
  return (
    <div className="border-border flex flex-col gap-0.5 rounded-lg border p-2.5">
      <span className={cn("text-lg font-semibold tabular-nums", tone)}>
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

function importableCount(
  analysis: ImportAnalysis,
  strategy: DuplicateStrategy
): number {
  const { counts } = analysis
  const base = counts.valid
  if (strategy === "skip") return base
  return base + counts.duplicate
}
