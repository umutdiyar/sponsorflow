import Link from "next/link"
import { Building2Icon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"

export default function CompanyNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <EmptyState
        icon={Building2Icon}
        title="Firma bulunamadı."
        description="Bu firma silinmiş, arşivlenmiş ya da başka bir organizasyona ait olabilir."
        action={
          <Button render={<Link href="/companies" />} nativeButton={false}>
            Firmalara dön
          </Button>
        }
      />
    </div>
  )
}
