import type { LucideIcon } from "lucide-react"

import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"

type PlaceholderPageProps = {
  title: string
  description: string
  icon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  actions?: React.ReactNode
}

/**
 * Professional placeholder for modules whose feature work is not in this phase.
 * Uses the same page header, spacing and panel treatment as real pages so the
 * shell stays consistent across every route.
 */
export function PlaceholderPage({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  actions,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title={title} description={description} actions={actions} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    </div>
  )
}
