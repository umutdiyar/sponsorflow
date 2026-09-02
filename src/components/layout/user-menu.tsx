"use client"

import { useTransition } from "react"
import Link from "next/link"
import {
  ChevronsUpDownIcon,
  Loader2Icon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/components/layout/current-user"
import { signOut } from "@/features/auth/actions"

type SidebarUserMenuProps = {
  collapsed?: boolean
}

/**
 * The account menu, homed in the sidebar footer. Only shows actions that map to
 * something real: Ayarlar and Çıkış Yap (no "Hesabım" — that page doesn't exist
 * yet). Logout uses the existing `signOut` server action untouched.
 */
export function SidebarUserMenu({ collapsed = false }: SidebarUserMenuProps) {
  const user = useCurrentUser()
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Hesap menüsü"
        className={cn(
          "hover:bg-sidebar-accent focus-visible:ring-sidebar-ring group flex w-full items-center gap-2 rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2",
          collapsed && "w-auto justify-center p-1"
        )}
      >
        <Avatar size="sm">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/55 truncate text-xs">
                {user.role}
              </span>
            </span>
            <ChevronsUpDownIcon className="text-sidebar-foreground/40 group-data-[state=open]:text-sidebar-foreground/70 size-3.5 shrink-0 transition-colors" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align={collapsed ? "center" : "start"}
        className="w-54"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="text-foreground truncate text-sm font-medium">
            {user.name}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <SettingsIcon />
              Ayarlar
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault()
            startTransition(() => signOut())
          }}
        >
          {isPending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
