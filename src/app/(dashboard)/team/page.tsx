import type { Metadata } from "next"
import { UsersRoundIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Ekip" }

export default function TeamPage() {
  return (
    <PlaceholderPage
      title="Ekip"
      description="Sponsorluk ekibindeki üyeleri, rolleri ve davetleri buradan yöneteceksin."
      icon={UsersRoundIcon}
      emptyTitle="Ekip üyeleri yakında burada."
      emptyDescription="Üye davet akışı eklendiğinde ekip listesi ve roller burada görünecek."
    />
  )
}
