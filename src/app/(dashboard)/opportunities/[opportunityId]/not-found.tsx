import Link from "next/link"
import { TargetIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"

export default function OpportunityNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <EmptyState
        icon={TargetIcon}
        title="Fırsat bulunamadı."
        description="Bu fırsat arşivlenmiş ya da başka bir organizasyona ait olabilir."
        action={
          <Button render={<Link href="/opportunities" />} nativeButton={false}>
            Fırsatlara dön
          </Button>
        }
      />
    </div>
  )
}
