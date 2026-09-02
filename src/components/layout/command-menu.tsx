"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { NAV_SECTIONS } from "@/components/layout/nav-config"

type CommandMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Navigation command palette. Real full-text search over CRM data will hook in
 * here later; for now it's a fast keyboard route switcher only.
 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()

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

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Sayfa ara veya git…" />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          {NAV_SECTIONS.map((section) => (
            <CommandGroup key={section.label} heading={section.label}>
              {section.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${section.label} ${item.title}`}
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
