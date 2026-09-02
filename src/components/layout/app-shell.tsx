"use client"

import { useState } from "react"

import type { SessionUser } from "@/lib/auth/dal"
import { usePersistentBoolean } from "@/hooks/use-persistent-boolean"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppHeader } from "@/components/layout/app-header"
import { CommandMenu } from "@/components/layout/command-menu"
import { CurrentUserProvider } from "@/components/layout/current-user"

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
    <CurrentUserProvider user={user}>
      <div className="bg-background flex min-h-svh w-full">
        {/* Desktop sidebar */}
        <aside
          data-collapsed={collapsed}
          className="sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 ease-out data-[collapsed=false]:w-60 data-[collapsed=true]:w-15 lg:flex"
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
          <SheetContent
            side="left"
            className="bg-sidebar w-64 border-none p-0"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Gezinme menüsü</SheetTitle>
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
            onOpenMobileSidebar={() => setMobileOpen(true)}
            onOpenCommandMenu={() => setCommandOpen(true)}
          />
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>

        <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
      </div>
    </CurrentUserProvider>
  )
}
