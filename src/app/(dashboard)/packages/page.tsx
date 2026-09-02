import type { Metadata } from "next"
import { PackageIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Sponsorluk Paketleri" }

export default function PackagesPage() {
  return (
    <PlaceholderPage
      title="Sponsorluk Paketleri"
      description="Sponsorluk seviyelerini ve sağlanan avantajları buradan yöneteceksin."
      icon={PackageIcon}
      emptyTitle="Henüz paket tanımlanmamış."
      emptyDescription="Platinum, Gold, Silver ve ürün sponsoru gibi paketlerini tanımlayarak tekliflerini hızlandır."
    />
  )
}
