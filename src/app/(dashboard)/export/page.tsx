import type { Metadata } from "next"
import { DownloadIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Dışa Aktar" }

export default function ExportPage() {
  return (
    <PlaceholderPage
      title="Dışa Aktar"
      description="Firmaları, fırsatları ve aktiviteleri raporlama için dışa aktaracaksın."
      icon={DownloadIcon}
      emptyTitle="Dışa aktarma yakında."
      emptyDescription="Filtre seçimi ve CSV/Excel çıktısı bu ekrana eklenecek."
    />
  )
}
