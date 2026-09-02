import type { Metadata } from "next"

import { getCurrentMembership } from "@/lib/auth/membership"
import { PageHeader } from "@/components/common/page-header"
import { Panel, PanelHeader, PanelContent } from "@/components/common/panel"
import { AccountPanel } from "@/features/settings/components/account-panel"

export const metadata: Metadata = { title: "Ayarlar" }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default async function SettingsPage() {
  const membership = await getCurrentMembership()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Ayarlar"
        description="Hesap ve organizasyon bilgilerini buradan yöneteceksin."
      />

      <AccountPanel roleLabel={membership.roleLabel} />

      <Panel>
        <PanelHeader title="Organizasyon" description="Aktif çalışma alanın" />
        <PanelContent className="divide-border divide-y py-1">
          <Row label="Organizasyon" value={membership.organization.name} />
          <Row label="Kısa ad" value={membership.organization.slug} />
          <Row label="Rolün" value={membership.roleLabel} />
        </PanelContent>
      </Panel>

      <p className="text-muted-foreground text-xs">
        Profil düzenleme, rol yönetimi ve organizasyon ayarları sonraki aşamada
        eklenecek.
      </p>
    </div>
  )
}
