import type { Metadata } from "next"
import { Building2Icon, PlusIcon } from "lucide-react"

import { ComingSoonButton } from "@/components/common/coming-soon-button"
import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Firmalar" }

export default function CompaniesPage() {
  return (
    <PlaceholderPage
      title="Firmalar"
      description="Firma veritabanı ve sponsorluk ilişkilerini buradan yöneteceksin."
      icon={Building2Icon}
      emptyTitle="Henüz firma eklenmemiş."
      emptyDescription="İlk firmanı ekleyerek sponsorluk sürecini başlat."
      actions={
        <ComingSoonButton hint="Firma ekleme yakında eklenecek.">
          <PlusIcon />
          Firma Ekle
        </ComingSoonButton>
      }
    />
  )
}
