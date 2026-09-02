import type { Metadata } from "next"
import { CheckSquareIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Görevler" }

export default function TasksPage() {
  return (
    <PlaceholderPage
      title="Görevler"
      description="Ekip üyelerine atanan takip aksiyonlarını ve son tarihleri buradan izleyeceksin."
      icon={CheckSquareIcon}
      emptyTitle="Açık görev yok."
      emptyDescription="Bir fırsat için takip görevi oluşturduğunda burada listelenecek."
    />
  )
}
