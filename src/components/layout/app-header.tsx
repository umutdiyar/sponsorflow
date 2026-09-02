"use client"

import { usePathname } from "next/navigation"
import { BellIcon, PanelLeftIcon, SearchIcon } from "lucide-react"

import type { SessionUser } from "@/lib/auth/dal"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { getPageTitle } from "@/components/layout/nav-config"
import { UserMenu } from "@/components/layout/user-menu"

type AppHeaderProps = {
  user: SessionUser
  onOpenMobileSidebar: () => void
  onOpenCommandMenu: () => void
}

export function AppHeader({
  user,
  onOpenMobileSidebar,
  onOpenCommandMenu,
}: AppHeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-4">
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
          className="border-input bg-input/30 text-muted-foreground hover:bg-input/50 hidden h-8 w-64 items-center gap-2 rounded-lg border px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:flex"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">
            Firma, kişi veya fırsat ara…
          </span>
          <Kbd>⌘K</Kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenCommandMenu}
          aria-label="Ara"
        >
          <SearchIcon />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Bildirimler"
          className="relative"
        >
          <BellIcon />
          <span className="bg-brand absolute top-1.5 right-1.5 size-1.5 rounded-full" />
        </Button>

        <div className="ml-1 hidden sm:block">
          <UserMenu user={user} align="end" collapsed />
        </div>
      </div>
    </header>
  )
}
