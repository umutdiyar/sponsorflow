import type { Metadata } from "next"

import { requirePermission } from "@/lib/auth/membership"
import { PageHeader } from "@/components/common/page-header"
import { Panel, PanelContent, PanelHeader } from "@/components/common/panel"
import { formatDate } from "@/lib/format"
import { ImportWizard } from "@/features/import/components/import-wizard"
import { listRecentImports } from "@/features/import/queries"

export const metadata: Metadata = { title: "İçe Aktar" }

export default async function ImportPage() {
  const membership = await requirePermission("data:import")
  const history = await listRecentImports(membership.organizationId)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="İçe Aktar"
        description="Firma listesini CSV veya Excel dosyasından toplu olarak ekle."
      />

      <ImportWizard />

      <Panel>
        <PanelHeader
          title="Son içe aktarmalar"
          description="Bu organizasyonda yapılan son aktarımlar."
        />
        <PanelContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Henüz içe aktarma yapılmadı.
            </p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{h.fileName}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(h.createdAt)} · {h.createdByName}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {h.importedRows} eklendi · {h.updatedRows} güncellendi ·{" "}
                    {h.skippedRows} atlandı · {h.failedRows} hatalı
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelContent>
      </Panel>
    </div>
  )
}
