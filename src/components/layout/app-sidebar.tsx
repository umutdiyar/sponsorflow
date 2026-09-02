"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftCloseIcon, PanelLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/auth/dal"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { NavItem } from "@/components/layout/nav-config"
import { NAV_SECTIONS } from "@/components/layout/nav-config"
import { OrgIdentity } from "@/components/layout/org-switcher"
import { UserMenu } from "@/components/layout/user-menu"

type AppSidebarProps = {
  user: SessionUser
  orgName: string
  collapsed: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Inner visual for a nav item. Lives inside `<Link>` so it can read
 * `useLinkStatus()` and show the target as active the instant it's clicked —
 * before the navigation commits.
 */
function NavItemBody({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const { pending } = useLinkStatus()
  const highlighted = active || pending

  return (
    <span
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
        highlighted
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/65 group-hover/nav:bg-sidebar-accent/60 group-hover/nav:text-sidebar-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {highlighted ? (
        <span
          aria-hidden
          className={cn(
            "bg-sidebar-primary absolute rounded-full",
            collapsed ? "inset-x-1.5 bottom-0 h-0.5" : "inset-y-1.5 left-0 w-0.5"
          )}
        />
      ) : null}
      <item.icon
        className={cn("size-4 shrink-0", pending && "animate-pulse")}
      />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </span>
  )
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3">
      <ul className="flex flex-col gap-4">
        {NAV_SECTIONS.map((section) => (
          <li key={section.label}>
            {!collapsed ? (
              <p className="text-sidebar-foreground/40 px-2 pb-1 text-[0.6875rem] font-medium tracking-wider uppercase">
                {section.label}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href)
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className="group/nav focus-visible:ring-sidebar-ring block rounded-md outline-none focus-visible:ring-2"
                  >
                    <NavItemBody
                      item={item}
                      active={active}
                      collapsed={collapsed}
                    />
                  </Link>
                )

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger render={link} />
                        <TooltipContent side="right">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function AppSidebar({
  user,
  orgName,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: AppSidebarProps) {
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full w-full flex-col">
      <div
        className={cn(
          "border-sidebar-border flex h-14 items-center border-b px-3",
          collapsed && "justify-center px-0"
        )}
      >
        <OrgIdentity orgName={orgName} collapsed={collapsed} />
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div
        className={cn(
          "border-sidebar-border border-t p-2.5",
          collapsed && "flex flex-col items-center gap-1"
        )}
      >
        {onToggleCollapsed ? (
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            className={cn(
              "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground mb-1 hidden lg:flex",
              !collapsed && "w-full justify-start"
            )}
          >
            {collapsed ? (
              <PanelLeftIcon />
            ) : (
              <>
                <PanelLeftCloseIcon />
                <span>Menüyü daralt</span>
              </>
            )}
          </Button>
        ) : null}
        <UserMenu user={user} collapsed={collapsed} onDark />
      </div>
    </div>
  )
}
