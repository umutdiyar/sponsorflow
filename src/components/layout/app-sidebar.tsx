"use client"

import Link from "next/link"
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
import { LogoMark } from "@/components/brand/logo"
import { NAV_SECTIONS } from "@/components/layout/nav-config"
import { OrgSwitcher } from "@/components/layout/org-switcher"
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

export function AppSidebar({
  user,
  orgName,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b px-3",
          collapsed && "justify-center px-0"
        )}
      >
        {collapsed ? (
          <LogoMark />
        ) : (
          <OrgSwitcher orgName={orgName} className="min-w-0 flex-1" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-4">
          {NAV_SECTIONS.map((section) => (
            <li key={section.label}>
              {!collapsed ? (
                <p className="text-muted-foreground/80 px-2 pb-1 text-[0.6875rem] font-medium tracking-wide uppercase">
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
                      className={cn(
                        "group/nav flex h-8 items-center gap-2.5 rounded-md px-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground group-hover/nav:text-foreground"
                        )}
                      />
                      {!collapsed ? (
                        <span className="truncate">{item.title}</span>
                      ) : null}
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

      <div
        className={cn(
          "border-t p-2",
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
              "text-muted-foreground mb-1 hidden lg:flex",
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
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </div>
  )
}
