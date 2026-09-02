import type { Metadata } from "next"
import { GitBranchIcon } from "lucide-react"

import { PlaceholderPage } from "@/components/common/placeholder-page"

export const metadata: Metadata = { title: "Pipeline" }

export default function PipelinePage() {
  return (
    <PlaceholderPage
      title="Pipeline"
      description="Fırsatları aşamalar arasında sürükleyerek sponsorluk hattını yöneteceksin."
      icon={GitBranchIcon}
      emptyTitle="Pipeline henüz boş."
      emptyDescription="Fırsat eklendikçe aşamalara göre buraya dizilecek."
    />
  )
}
