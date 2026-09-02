"use client"

import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon, PanelLeftCloseIcon, PanelLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BrandIdentity } from "@/components/brand/logo"
import type { NavItem, NavSection } from "@/components/layout/nav-config"
import {
  NAV_BOTTOM,
  NAV_ITEMS,
  NAV_SECTIONS,
  NAV_TOP,
} from "@/components/layout/nav-config"
import { SidebarUserMenu } from "@/components/layout/user-menu"

type SidebarOrg = { name: string; subtitle?: string }

type AppSidebarProps = {
  org: SidebarOrg
  collapsed: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Inner visual — lives inside `<Link>` so it can read `useLinkStatus()`. */
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
        "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.8125rem] transition-colors duration-150",
        highlighted
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/65 group-hover/nav:bg-sidebar-accent/60 group-hover/nav:text-sidebar-foreground",
        collapsed && "size-9 justify-center px-0"
      )}
    >
      {highlighted ? (
        <span
          aria-hidden
          className={cn(
            "bg-sidebar-primary absolute rounded-full",
            collapsed ? "inset-x-2 bottom-0 h-0.5" : "inset-y-1.5 left-0 w-0.5"
          )}
        />
      ) : null}
      <item.icon className={cn("size-4 shrink-0", pending && "animate-pulse")} />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </span>
  )
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const active = isActive(pathname, item.href)

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="group/nav focus-visible:ring-sidebar-ring block rounded-md outline-none focus-visible:ring-2"
    >
      <NavItemBody item={item} active={active} collapsed={collapsed} />
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sidebar-foreground/40 px-2 pb-1 text-[0.6875rem] font-medium tracking-wider uppercase">
      {children}
    </p>
  )
}

function CollapsibleGroup({
  section,
  onNavigate,
}: {
  section: NavSection
  onNavigate?: () => void
}) {
  const [expanded, setExpanded] = usePersistentBoolean(
    `sponsorflow:nav-section:${section.label}`,
    true
  )

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="flex flex-col">
      <CollapsibleTrigger className="group/section text-sidebar-foreground/45 hover:text-sidebar-foreground/70 focus-visible:ring-sidebar-ring flex w-full items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-medium tracking-wider uppercase outline-none transition-colors focus-visible:ring-2">
        <ChevronRightIcon className="size-3 shrink-0 transition-transform duration-200 group-data-[state=open]/section:rotate-90 motion-reduce:transition-none" />
        {section.label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {section.items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} collapsed={false} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  if (collapsed) {
    return (
      <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3">
      <div className="mb-4">
        <SectionLabel>Genel</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {NAV_TOP.map((item) => (
            <li key={item.href}>
              <NavLink item={item} collapsed={false} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        {NAV_SECTIONS.map((section) =>
          section.collapsible ? (
            <CollapsibleGroup
              key={section.label}
              section={section}
              onNavigate={onNavigate}
            />
          ) : (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      collapsed={false}
                      onNavigate={onNavigate}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>

      <ul className="border-sidebar-border mt-4 flex flex-col gap-0.5 border-t pt-4">
        {NAV_BOTTOM.map((item) => (
          <li key={item.href}>
            <NavLink item={item} collapsed={false} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function AppSidebar({
  org,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: AppSidebarProps) {
  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full w-full flex-col">
      <div
        className={cn(
          "border-sidebar-border flex items-center border-b",
          collapsed ? "h-14 justify-center px-0" : "px-3 py-3.5"
        )}
      >
        <BrandIdentity
          organization={org.name}
          compact={collapsed}
          className={collapsed ? undefined : "w-full"}
        />
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div
        className={cn(
          "border-sidebar-border flex flex-col gap-1 border-t p-2.5",
          collapsed && "items-center"
        )}
      >
        {onToggleCollapsed ? (
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            className={cn(
              "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground hidden lg:flex",
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
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </div>
  )
}
