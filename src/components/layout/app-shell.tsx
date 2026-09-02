"use client"

import { useState } from "react"

import type { SessionUser } from "@/lib/auth/dal"
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { CommandMenu } from "@/components/layout/command-menu"

type AppShellProps = {
  user: SessionUser
  orgName: string
  children: React.ReactNode
}

export function AppShell({ user, orgName, children }: AppShellProps) {
  const [collapsed, , toggleCollapsed] = usePersistentBoolean(
    "sponsorflow:sidebar-collapsed",
    false
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <div className="bg-background flex min-h-svh w-full">
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed}
        className="border-border bg-sidebar sticky top-0 hidden h-svh shrink-0 border-r transition-[width] duration-200 ease-out data-[collapsed=false]:w-60 data-[collapsed=true]:w-[3.75rem] lg:flex"
      >
        <AppSidebar
          user={user}
          orgName={orgName}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <AppSidebar
            user={user}
            orgName={orgName}
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenCommandMenu={() => setCommandOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
