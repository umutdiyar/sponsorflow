"use client"

import { Fragment, useMemo } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  formatTime,
  istanbulDayKey,
  timelineGroupLabel,
} from "@/lib/format"
import { EmptyState } from "@/components/common/empty-state"
import { ActivityIcon } from "@/features/activities/components/activity-icon"
import { ACTIVITY_TYPE_LABELS } from "@/features/activities/schema"
import { ActivityIcon as ActivityLucide } from "lucide-react"
import type { ActivityListItem } from "@/features/activities/queries"

type Props = {
  activities: ActivityListItem[]
  /** Show company / opportunity context on each row (global feed). */
  showContext?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function ActivityTimeline({
  activities,
  showContext = false,
  emptyTitle = "Henüz aktivite kaydı yok.",
  emptyDescription = "Bir görüşme, e-posta veya not eklediğinde burada birikecek.",
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, ActivityListItem[]>()
    for (const a of activities) {
      const key = istanbulDayKey(a.occurredAt)
      const bucket = map.get(key)
      if (bucket) bucket.push(a)
      else map.set(key, [a])
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [activities])

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={ActivityLucide}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([key, items]) => (
        <div key={key} className="flex flex-col gap-1">
          <h4 className="text-muted-foreground sticky top-0 z-10 bg-inherit py-1 text-xs font-semibold tracking-wide uppercase">
            {timelineGroupLabel(items[0]!.occurredAt)}
          </h4>
          <ol className="relative flex flex-col">
            {items.map((a, i) => (
              <li
                key={a.id}
                className="animate-in fade-in-0 slide-in-from-left-1 relative flex gap-3 pb-4 duration-300 last:pb-0 motion-reduce:animate-none"
              >
                <div className="flex flex-col items-center">
                  <ActivityIcon type={a.type} />
                  {i < items.length - 1 ? (
                    <span className="bg-border mt-1 w-px flex-1" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">
                      {a.title?.trim() || ACTIVITY_TYPE_LABELS[a.type]}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatTime(a.occurredAt)}
                    </span>
                  </div>
                  {a.description ? (
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {a.description}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    <span>{a.author}</span>
                    {a.contactName ? (
                      <Fragment>
                        <span aria-hidden>·</span>
                        <span>{a.contactName}</span>
                      </Fragment>
                    ) : null}
                    {showContext ? (
                      <Fragment>
                        <span aria-hidden>·</span>
                        <Link
                          href={`/companies/${a.companyId}`}
                          className={cn(
                            "hover:text-foreground underline-offset-2 hover:underline"
                          )}
                        >
                          {a.companyName}
                        </Link>
                        {a.opportunityId ? (
                          <Fragment>
                            <span aria-hidden>·</span>
                            <Link
                              href={`/opportunities/${a.opportunityId}`}
                              className="hover:text-foreground underline-offset-2 hover:underline"
                            >
                              {a.opportunityTitle}
                            </Link>
                          </Fragment>
                        ) : null}
                      </Fragment>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  )
}
