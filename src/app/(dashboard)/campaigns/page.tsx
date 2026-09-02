import type { Metadata } from "next"
import { MegaphoneIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Kampanyalar" }

export default function CampaignsPage() {
  return (
    <PlaceholderPage
      title="Kampanyalar"
      description="Etkinlik ve dönem bazlı sponsorluk kampanyalarını buradan planlayacaksın."
      icon={MegaphoneIcon}
      emptyTitle="Henüz kampanya yok."
      emptyDescription="Bir etkinlik için kampanya oluşturarak hedef firmaları grupla."
    />
  )
}
