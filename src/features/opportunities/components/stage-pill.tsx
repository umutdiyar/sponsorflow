import { cn } from "@/lib/utils"
import type { PipelineStageType } from "@/generated/prisma/enums"

const TYPE_CLASS: Record<PipelineStageType, string> = {
  OPEN: "bg-info/10 text-info",
  WON: "bg-success/10 text-success",
  LOST: "bg-destructive/10 text-destructive",
}

type StagePillProps = {
  name: string
  type: PipelineStageType
  className?: string
}

/** Small colored label for a pipeline stage. Tone comes from the stage type. */
export function StagePill({ name, type, className }: StagePillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        TYPE_CLASS[type],
        className
      )}
    >
      {name}
    </span>
  )
}
