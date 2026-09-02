import { cn } from "@/lib/utils"
import type { PipelineStage } from "@/features/dashboard/types"

type StageTone = "neutral" | "info" | "warning" | "success"

const STAGE_TONE: Record<PipelineStage, StageTone> = {
  Araştırma: "neutral",
  "İletişim Bulundu": "neutral",
  "İletişime Geçildi": "info",
  "Yanıt Alındı": "info",
  Görüşme: "info",
  Teklif: "warning",
  Müzakere: "warning",
  Kazanıldı: "success",
}

const TONE_CLASS: Record<StageTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning-foreground",
  success: "bg-success/10 text-success",
}

export function StageBadge({ stage }: { stage: PipelineStage }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[STAGE_TONE[stage]]
      )}
    >
      {stage}
    </span>
  )
}
