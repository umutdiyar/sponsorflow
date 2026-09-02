import type { Metadata } from "next"
import Link from "next/link"
import { Building2Icon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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
        <Button render={<Link href="/companies" />} nativeButton={false}>
          <PlusIcon />
          Firma Ekle
        </Button>
      }
    />
  )
}
