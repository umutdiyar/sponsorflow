import type { Metadata } from "next"
import { UsersIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Kişiler" }

export default function ContactsPage() {
  return (
    <PlaceholderPage
      title="Kişiler"
      description="Firmalardaki karar vericileri ve iletişim kişilerini burada takip edeceksin."
      icon={UsersIcon}
      emptyTitle="Henüz kişi eklenmemiş."
      emptyDescription="Bir firmaya iletişim kişisi ekleyerek görüşmeleri kişiselleştir."
    />
  )
}
