import Link from "next/link"
import {
  CalendarClockIcon,
  GripVerticalIcon,
  PackageIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  describeDue,
  formatMoneyCompact,
  formatTimeAgo,
} from "@/lib/format"
import type { OpportunityRow } from "@/features/opportunities/queries"

const DUE_TONE: Record<string, string> = {
  overdue: "text-destructive",
  today: "text-warning-foreground",
  soon: "text-foreground",
  later: "text-muted-foreground",
  none: "text-muted-foreground",
}

type Props = {
  opportunity: OpportunityRow
  overlay?: boolean
  dragging?: boolean
  handleProps?: Record<string, unknown>
  handleRef?: (el: HTMLButtonElement | null) => void
  canMove?: boolean
}

export function PipelineCard({
  opportunity: o,
  overlay,
  dragging,
  handleProps,
  handleRef,
  canMove,
}: Props) {
  const due = describeDue(o.nextActionAt)

  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-2 rounded-lg p-2.5 text-sm ring-1 transition-shadow",
        overlay && "shadow-lg",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-xs">
            {o.companyName}
          </p>
          <Link
            href={`/opportunities/${o.id}`}
            className="line-clamp-2 font-medium hover:underline"
          >
            {o.title}
          </Link>
        </div>
        {canMove ? (
          <button
            type="button"
            aria-label="Kartı taşı"
            ref={handleRef}
            className="text-muted-foreground hover:text-foreground -mr-1 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
            {...handleProps}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {o.owner ? (
          <span className="inline-flex items-center gap-1">
            <UserIcon className="size-3" />
            {o.owner.name}
          </span>
        ) : null}
        {o.estimatedValue != null ? (
          <span className="text-foreground font-medium tabular-nums">
            {formatMoneyCompact(o.estimatedValue, o.currency)}
          </span>
        ) : null}
        {o.packageName ? (
          <span className="inline-flex items-center gap-1">
            <PackageIcon className="size-3" />
            {o.packageName}
          </span>
        ) : null}
      </div>

      {o.nextAction ? (
        <p
          className={cn(
            "flex items-start gap-1 text-xs",
            DUE_TONE[due.tone]
          )}
        >
          <CalendarClockIcon className="mt-0.5 size-3 shrink-0" />
          <span className="line-clamp-2">
            {o.nextAction}
            {o.nextActionAt ? (
              <span className="font-medium"> · {due.label}</span>
            ) : null}
          </span>
        </p>
      ) : null}

      <p className="text-muted-foreground text-[0.6875rem]">
        {o.lastActivityAt
          ? `Son hareket ${formatTimeAgo(o.lastActivityAt)}`
          : "Henüz aktivite yok"}
      </p>
    </div>
  )
}
