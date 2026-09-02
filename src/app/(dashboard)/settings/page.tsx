import type { Metadata } from "next"

import { requireUser } from "@/lib/auth/dal"
import { CURRENT_ORGANIZATION } from "@/lib/organization"
import { PageHeader } from "@/components/common/page-header"
import { Panel, PanelHeader, PanelContent } from "@/components/common/panel"

export const metadata: Metadata = { title: "Ayarlar" }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default async function SettingsPage() {
  const user = await requireUser()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Ayarlar"
        description="Hesap ve organizasyon bilgilerini buradan yöneteceksin."
      />

      <Panel>
        <PanelHeader title="Hesap" description="Profil bilgilerin" />
        <PanelContent className="divide-border divide-y py-1">
          <Row label="Ad" value={user.name} />
          <Row label="E-posta" value={user.email} />
          <Row label="Rol" value={user.role} />
        </PanelContent>
      </Panel>

      <Panel>
        <PanelHeader
          title="Organizasyon"
          description="Aktif çalışma alanın"
        />
        <PanelContent className="divide-border divide-y py-1">
          <Row label="Organizasyon" value={CURRENT_ORGANIZATION.name} />
          <Row label="Kısa ad" value={CURRENT_ORGANIZATION.shortName} />
        </PanelContent>
      </Panel>

      <p className="text-muted-foreground text-xs">
        Profil düzenleme, rol yönetimi ve organizasyon ayarları sonraki
        aşamada eklenecek.
      </p>
    </div>
  )
}
