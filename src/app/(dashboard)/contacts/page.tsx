import type { Metadata } from "next"
import { UsersIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Kişiler" }

export default function ContactsPage() {
  return (
    <PlaceholderPage
      title="Kişiler"
      description="Tüm firmalardaki iletişim kişilerinin birleşik listesi yakında burada olacak."
      icon={UsersIcon}
      emptyTitle="Kişiler firma detayından yönetiliyor."
      emptyDescription="Şimdilik kişileri ilgili firmanın sayfasındaki Kişiler sekmesinden ekleyebilirsin."
    />
  )
}
