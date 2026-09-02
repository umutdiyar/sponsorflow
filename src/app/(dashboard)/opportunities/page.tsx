import type { Metadata } from "next"
import { TargetIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Fırsatlar" }

export default function OpportunitiesPage() {
  return (
    <PlaceholderPage
      title="Fırsatlar"
      description="Sponsorluk fırsatlarını değer, aşama ve sorumluya göre yöneteceksin."
      icon={TargetIcon}
      emptyTitle="Henüz fırsat oluşturulmamış."
      emptyDescription="Bir firmayla ilk teması kurduğunda fırsat oluşturarak süreci başlat."
    />
  )
}
