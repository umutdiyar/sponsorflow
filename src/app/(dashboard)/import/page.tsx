import type { Metadata } from "next"
import { UploadIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "İçe Aktar" }

export default function ImportPage() {
  return (
    <PlaceholderPage
      title="İçe Aktar"
      description="Firma ve kişi listelerini CSV veya Excel dosyasından toplu olarak aktaracaksın."
      icon={UploadIcon}
      emptyTitle="İçe aktarma yakında."
      emptyDescription="Dosya yükleme ve alan eşleştirme akışı bu ekrana eklenecek."
    />
  )
}
