import type { Metadata } from "next"
import { ActivityIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Aktiviteler" }

export default function ActivitiesPage() {
  return (
    <PlaceholderPage
      title="Aktiviteler"
      description="E-posta, görüşme ve not gibi tüm etkileşimlerin zaman çizelgesi burada olacak."
      icon={ActivityIcon}
      emptyTitle="Henüz aktivite kaydı yok."
      emptyDescription="Bir görüşme veya not eklediğinde ekip geçmişi burada birikecek."
    />
  )
}
