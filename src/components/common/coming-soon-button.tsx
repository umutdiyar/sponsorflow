"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type ComingSoonButtonProps = {
  children: React.ReactNode
  hint?: string
  className?: string
}

/**
 * A primary-looking action that isn't wired to a real flow yet. Rendered as a
 * genuinely disabled button (not a fake click target) with a tooltip that says
 * so. The tooltip trigger is the wrapping span, since disabled buttons don't
 * emit pointer events.
 */
export function ComingSoonButton({
  children,
  hint = "Bu özellik yakında eklenecek.",
  className,
}: ComingSoonButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        tabIndex={0}
        aria-label={hint}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "text-muted-foreground cursor-default gap-1.5 focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {children}
        <span className="bg-muted text-muted-foreground ml-0.5 rounded px-1.5 py-0.5 text-[0.625rem] font-medium">
          Yakında
        </span>
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )
}
