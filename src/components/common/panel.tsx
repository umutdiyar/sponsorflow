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

type PanelAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never }

type PanelHeaderProps = {
  title: string
  description?: string
  action?: PanelAction
  className?: string
}

const actionClass =
  "text-muted-foreground hover:text-foreground shrink-0 rounded-sm text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"

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
      {action?.href ? (
        <Link href={action.href} className={actionClass}>
          {action.label}
        </Link>
      ) : action?.onClick ? (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}

function PanelContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />
}

export { Panel, PanelHeader, PanelContent }
