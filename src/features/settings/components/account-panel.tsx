"use client"

import { Panel, PanelHeader, PanelContent } from "@/components/common/panel"
import { useCurrentUser } from "@/components/layout/current-user"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

/**
 * Account details, read from the already-validated user in context — no extra
 * `getUser()` round-trip on navigation to Settings.
 */
export function AccountPanel() {
  const user = useCurrentUser()

  return (
    <Panel>
      <PanelHeader title="Hesap" description="Profil bilgilerin" />
      <PanelContent className="divide-border divide-y py-1">
        <Row label="Ad" value={user.name} />
        <Row label="E-posta" value={user.email} />
        <Row label="Rol" value={user.role} />
      </PanelContent>
    </Panel>
  )
}
