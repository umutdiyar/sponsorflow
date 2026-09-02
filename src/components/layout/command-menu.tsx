"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { NAV_SECTIONS } from "@/components/layout/nav-config"

type CommandMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

  function runCommand(action: () => void) {
    onOpenChange(false)
    action()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Firma, kişi veya fırsat ara…" />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>

        <CommandGroup heading="Hızlı işlemler">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/companies"))}
          >
            <PlusIcon />
            Firma ekle
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/opportunities"))}
          >
            <PlusIcon />
            Fırsat ekle
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {NAV_SECTIONS.map((section) => (
          <CommandGroup key={section.label} heading={section.label}>
            {section.items.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Arama">
          <CommandItem disabled>
            <SearchIcon />
            Tam metin arama yakında eklenecek
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
