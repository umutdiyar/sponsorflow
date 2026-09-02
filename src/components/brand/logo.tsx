import { cn } from "@/lib/utils"

type LogoMarkProps = {
  className?: string
}

/**
 * SponsorFlow mark — three converging bars ("flow") in the brand accent.
 * Independent product identity; not tied to any sponsor's branding.
 */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "bg-brand text-brand-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md",
        className
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-4"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 7h16M4 12h11M4 17h6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

type WordmarkProps = {
  className?: string
  withMark?: boolean
}

export function Wordmark({ className, withMark = true }: WordmarkProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {withMark ? <LogoMark /> : null}
      <span className="font-heading text-[0.95rem] leading-none font-semibold tracking-tight">
        SponsorFlow
      </span>
    </span>
  )
}
