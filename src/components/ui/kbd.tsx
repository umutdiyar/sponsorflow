import * as React from "react"

import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center justify-center gap-1 rounded-sm px-1.5 font-sans text-[0.6875rem] font-medium select-none",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
