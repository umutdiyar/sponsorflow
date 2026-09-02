"use client"

import { ChevronsUpDownIcon, CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogoMark } from "@/components/brand/logo"

type OrgIdentityProps = {
  orgName: string
  collapsed?: boolean
  className?: string
}

/**
 * Brand + organization identity block shown at the top of the sidebar. Doubles
 * as the (not-yet-functional) organization switcher trigger so the affordance is
 * already in place for multi-org support.
 */
export function OrgIdentity({
  orgName,
  collapsed = false,
  className,
}: OrgIdentityProps) {
  if (collapsed) {
    return <LogoMark />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-sidebar-accent focus-visible:ring-sidebar-ring flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left outline-none transition-colors focus-visible:ring-2",
          className
        )}
      >
        <LogoMark />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">SponsorFlow</span>
          <span className="text-sidebar-foreground/55 truncate text-[0.6875rem] leading-tight">
            AWS Student Builder Group
          </span>
        </span>
        <ChevronsUpDownIcon className="text-sidebar-foreground/40 size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizasyon</DropdownMenuLabel>
          <DropdownMenuItem className="gap-2">
            <LogoMark className="size-5 rounded-[5px]" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{orgName}</span>
              <span className="text-muted-foreground truncate text-xs">
                Istanbul Okan University
              </span>
            </span>
            <CheckIcon className="size-4 shrink-0" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          Yeni organizasyon ekle (yakında)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
