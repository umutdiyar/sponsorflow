"use client"

import { useMemo, useState } from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon, UserIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { MemberOption } from "@/features/companies/queries"

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

type Props = {
  members: MemberOption[]
  currentMembershipId: string | null
  currentName: string | null
  onAssign: (membershipId: string | null) => void
  disabled?: boolean
  /** Compact = table cell trigger; button = standalone. */
  variant?: "cell" | "button"
}

export function OwnerAssignPopover({
  members,
  currentMembershipId,
  currentName,
  onAssign,
  disabled = false,
  variant = "cell",
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr")
    return q
      ? members.filter((m) => m.name.toLocaleLowerCase("tr").includes(q))
      : members
  }, [members, query])

  function pick(id: string | null) {
    setOpen(false)
    setQuery("")
    if (id !== currentMembershipId) onAssign(id)
  }

  if (disabled) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5">
        {currentName ?? "Atanmamış"}
      </span>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setQuery("")
      }}
    >
      <PopoverTrigger
        className={cn(
          "group/assign inline-flex items-center gap-1.5 rounded-md text-left outline-none",
          variant === "cell"
            ? "hover:bg-muted -mx-1.5 px-1.5 py-0.5 focus-visible:ring-2 focus-visible:ring-ring"
            : "border-input hover:bg-muted h-8 border px-2.5 focus-visible:ring-2 focus-visible:ring-ring"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {currentName ? (
          <>
            <Avatar size="sm" className="size-5">
              <AvatarFallback className="text-[0.625rem]">
                {initials(currentName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{currentName}</span>
          </>
        ) : (
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <UserIcon className="size-3.5" />
            Atanmamış
          </span>
        )}
        <ChevronDownIcon className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover/assign:opacity-100 group-data-[state=open]/assign:opacity-100" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b p-1.5">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Üye ara…"
            className="h-7 w-full rounded-md bg-transparent pr-2 pl-7 text-sm outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          <button
            type="button"
            onClick={() => pick(null)}
            className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
          >
            <span className="bg-muted flex size-5 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-3" />
            </span>
            <span className="flex-1">Atanmamış</span>
            {currentMembershipId === null ? (
              <CheckIcon className="size-3.5" />
            ) : null}
          </button>
          {filtered.map((m) => (
            <button
              key={m.membershipId}
              type="button"
              onClick={() => pick(m.membershipId)}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
            >
              <Avatar size="sm" className="size-5">
                <AvatarFallback className="text-[0.625rem]">
                  {initials(m.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{m.name}</span>
              {currentMembershipId === m.membershipId ? (
                <CheckIcon className="size-3.5" />
              ) : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-center text-xs">
              Eşleşen üye yok
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
