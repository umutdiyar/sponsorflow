"use client"

import { useTransition } from "react"
import {
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
} from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/auth/dal"
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
import { signOut } from "@/features/auth/actions"

type UserMenuProps = {
  user: SessionUser
  collapsed?: boolean
  align?: "start" | "center" | "end"
}

export function UserMenu({
  user,
  collapsed = false,
  align = "start",
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-accent flex w-full items-center gap-2 rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          collapsed && "w-auto justify-center p-1"
        )}
      >
        <Avatar size="sm">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{user.initials}</AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.role}
              </span>
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground size-3.5 shrink-0" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side="top" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium">
              {user.name}
            </span>
            <span className="text-muted-foreground text-xs font-normal">
              {user.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <UserIcon />
            Hesabım
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon />
            Ayarlar
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          closeOnClick={false}
          disabled={isPending}
          onClick={() => startTransition(() => signOut())}
        >
          {isPending ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />}
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
