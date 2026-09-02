"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2Icon, Loader2Icon } from "lucide-react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { NavItem } from "@/components/layout/nav-config"
import {
  NAV_BOTTOM,
  NAV_SECTIONS,
  NAV_TOP,
} from "@/components/layout/nav-config"
import {
  quickSearchCompanies,
  type CompanySearchHit,
} from "@/features/companies/search"

type CommandMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Genel", items: NAV_TOP },
  ...NAV_SECTIONS.map((s) => ({ label: s.label, items: s.items })),
  { label: "Yönetim", items: NAV_BOTTOM },
]

/**
 * Command palette: navigates between pages and does a live, org-scoped company
 * lookup (type-ahead). Not a global search engine — one small query per keystroke.
 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<CompanySearchHit[]>([])
  const [isSearching, startSearch] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (timer.current) clearTimeout(timer.current)
    if (value.trim().length < 2) {
      setHits([])
      return
    }
    timer.current = setTimeout(() => {
      startSearch(async () => {
        setHits(await quickSearchCompanies(value))
      })
    }, 250)
  }

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setQuery("")
          setHits([])
        }
      }}
    >
      <Command shouldFilter={query.trim().length < 2}>
        <CommandInput
          placeholder="Firma veya sayfa ara…"
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Aranıyor…" : "Sonuç bulunamadı."}
          </CommandEmpty>

          {hits.length > 0 ? (
            <CommandGroup heading="Firmalar">
              {hits.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`firma ${hit.name}`}
                  onSelect={() => go(`/companies/${hit.id}`)}
                >
                  <Building2Icon />
                  <span className="flex-1 truncate">{hit.name}</span>
                  {hit.industry ? (
                    <span className="text-muted-foreground truncate text-xs">
                      {hit.industry}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {query.trim().length >= 2 && isSearching && hits.length === 0 ? (
            <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-sm">
              <Loader2Icon className="size-4 animate-spin" />
              Firmalar aranıyor…
            </div>
          ) : null}

          {GROUPS.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${group.label} ${item.title}`}
                  onSelect={() => go(item.href)}
                >
                  <item.icon />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
