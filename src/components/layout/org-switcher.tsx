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

type OrgSwitcherProps = {
  orgName: string
  className?: string
}

/**
 * Displays the active organization. The switcher UI is in place for when
 * multi-org support lands; for now there is a single organization.
 */
export function OrgSwitcher({ orgName, className }: OrgSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-accent flex items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        <LogoMark />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">SponsorFlow</span>
          <span className="text-muted-foreground truncate text-xs">
            {orgName}
          </span>
        </span>
        <ChevronsUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizasyon</DropdownMenuLabel>
          <DropdownMenuItem className="gap-2">
            <LogoMark className="size-5 rounded-[4px]" />
            <span className="flex-1 truncate">{orgName}</span>
            <CheckIcon className="size-4" />
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
