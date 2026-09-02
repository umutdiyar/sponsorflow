import Image from "next/image"

import { cn } from "@/lib/utils"

const LOGO_SRC = "/brand/aws-sbg-okan-logo.svg"
const LOGO_ALT = "AWS Student Builder Group at Okan University"

type ClubLogoProps = {
  /** Rendered box size in px (the mark is square). */
  size?: number
  className?: string
  priority?: boolean
}

/**
 * The club's mark — the single visual identity for SponsorFlow's chrome.
 * Local asset in `public/brand/`; the mark already carries its own dark ground,
 * so it just needs a rounded frame to read as an app icon on the navy sidebar.
 */
export function ClubLogo({ size = 28, className, priority }: ClubLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "shrink-0 rounded-md object-contain ring-1 ring-white/10",
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}

type BrandIdentityProps = {
  /** Organization line under the product name. */
  organization?: string
  /** Icon-only (collapsed sidebar). */
  compact?: boolean
  className?: string
}

/**
 * The one identity block: club mark + "SponsorFlow" / "Sponsorluk CRM", and a
 * single organization line. No repeated org/university strings, no separate
 * product icon — one mark, one hierarchy.
 */
export function BrandIdentity({
  organization,
  compact = false,
  className,
}: BrandIdentityProps) {
  if (compact) {
    return <ClubLogo size={30} className={className} priority />
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2.5">
        <ClubLogo size={30} priority />
        <span className="flex min-w-0 flex-col">
          <span className="font-heading text-[0.9rem] leading-tight font-semibold tracking-tight">
            SponsorFlow
          </span>
          <span className="text-sidebar-foreground/50 text-[0.6875rem] leading-tight">
            Sponsorluk CRM
          </span>
        </span>
      </div>
      {organization ? (
        <p className="text-sidebar-foreground/55 truncate text-xs leading-tight">
          {organization}
        </p>
      ) : null}
    </div>
  )
}

type WordmarkProps = {
  className?: string
  /** Small descriptor under the name. */
  label?: string
  size?: number
}

/** Compact brand lockup for the auth screens. */
export function Wordmark({ className, label, size = 30 }: WordmarkProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <ClubLogo size={size} priority />
      <span className="flex min-w-0 flex-col">
        <span className="font-heading text-[0.9rem] leading-tight font-semibold tracking-tight">
          SponsorFlow
        </span>
        {label ? (
          <span className="text-[0.6875rem] leading-tight opacity-55">
            {label}
          </span>
        ) : null}
      </span>
    </span>
  )
}
