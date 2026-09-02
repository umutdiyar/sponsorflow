import Link from "next/link"

import { cn } from "@/lib/utils"

function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "border-border bg-card flex flex-col rounded-xl border",
        className
      )}
      {...props}
    />
  )
}

type PanelHeaderProps = {
  title: string
  description?: string
  action?: { label: string; href: string }
  className?: string
}

function PanelHeader({
  title,
  description,
  action,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-3",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-muted-foreground hover:text-foreground shrink-0 rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />
}

export { Panel, PanelHeader, PanelContent }
