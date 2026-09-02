"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  Building2Icon,
  ChevronDownIcon,
  PanelLeftIcon,
  SearchIcon,
  UploadIcon,
  ZapIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getPageTitle } from "@/components/layout/nav-config"

type AppHeaderProps = {
  onOpenMobileSidebar: () => void
  onOpenCommandMenu: () => void
}

export function AppHeader({
  onOpenMobileSidebar,
  onOpenCommandMenu,
}: AppHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const title = getPageTitle(pathname)

  return (
    <header className="bg-background/85 supports-backdrop-filter:bg-background/65 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-3 backdrop-blur sm:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Menüyü aç"
      >
        <PanelLeftIcon />
      </Button>

      <h1 className="font-heading shrink-0 truncate text-sm font-semibold sm:text-[0.9rem]">
        {title}
      </h1>

      {/* Center: search / command trigger */}
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onOpenCommandMenu}
          aria-keyshortcuts="Meta+K Control+K"
          className="border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:border-border hidden h-9 w-full max-w-130 items-center gap-2.5 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">
            Firma veya sayfa ara…
          </span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenCommandMenu}
          aria-label="Ara"
        >
          <SearchIcon />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ZapIcon className="size-4" />
              <span className="hidden sm:inline">Hızlı İşlem</span>
              <ChevronDownIcon className="text-muted-foreground size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Hızlı işlem</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => router.push("/companies?new=1")}
            >
              <Building2Icon />
              Firma Ekle
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/import")}>
              <UploadIcon />
              Veri İçe Aktar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
