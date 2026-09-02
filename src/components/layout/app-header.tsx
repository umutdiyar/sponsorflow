"use client"

import { usePathname } from "next/navigation"
import { PanelLeftIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { getPageTitle } from "@/components/layout/nav-config"
import { useCurrentUser } from "@/components/layout/current-user"
import { UserMenu } from "@/components/layout/user-menu"

type AppHeaderProps = {
  onOpenMobileSidebar: () => void
  onOpenCommandMenu: () => void
}

export function AppHeader({
  onOpenMobileSidebar,
  onOpenCommandMenu,
}: AppHeaderProps) {
  const pathname = usePathname()
  const user = useCurrentUser()
  const title = getPageTitle(pathname)

  return (
    <header className="bg-background/90 supports-backdrop-filter:bg-background/70 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-3 backdrop-blur sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Menüyü aç"
      >
        <PanelLeftIcon />
      </Button>

      <h1 className="font-heading truncate text-sm font-semibold">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onOpenCommandMenu}
          aria-keyshortcuts="Meta+K Control+K"
          className="border-input bg-muted/40 text-muted-foreground hover:bg-muted hidden h-8 w-56 items-center gap-2 rounded-lg border px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:flex xl:w-64"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">Ara…</span>
          <Kbd>⌘K</Kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onOpenCommandMenu}
          aria-label="Ara"
        >
          <SearchIcon />
        </Button>

        <div className="ml-1 hidden sm:block">
          <UserMenu user={user} align="end" collapsed />
        </div>
      </div>
    </header>
  )
}
