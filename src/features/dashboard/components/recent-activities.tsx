import { Panel, PanelHeader } from "@/components/common/panel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ActivityEntry } from "@/features/dashboard/types"

type RecentActivitiesProps = {
  activities: ActivityEntry[]
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <Panel>
      <PanelHeader
        title="Son Aktiviteler"
        description="Ekibin son hareketleri"
        action={{ label: "Tümü", href: "/activities" }}
      />
      <ul className="divide-border divide-y">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-start gap-3 px-4 py-3">
            <Avatar size="sm" className="mt-0.5">
              <AvatarFallback>{initials(activity.actor)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm leading-snug">{activity.message}</p>
              <span className="text-muted-foreground text-xs">
                {activity.timeAgo}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
