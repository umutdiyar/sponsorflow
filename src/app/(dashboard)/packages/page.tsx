import type { Metadata } from "next"
import { PackageIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Sponsorluk Paketleri" }

export default function PackagesPage() {
  return (
    <PlaceholderPage
      title="Sponsorluk Paketleri"
      description="Altın, gümüş ve özel paket tanımlarını ve haklarını burada yöneteceksin."
      icon={PackageIcon}
      emptyTitle="Henüz paket tanımlanmamış."
      emptyDescription="Standart paketlerini oluşturarak tekliflerini hızlandır."
    />
  )
}
