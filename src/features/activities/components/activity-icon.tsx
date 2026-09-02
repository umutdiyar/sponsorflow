import {
  ArrowRightLeftIcon,
  CalendarIcon,
  FileTextIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  RotateCwIcon,
  Share2Icon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ActivityType } from "@/generated/prisma/enums"

const ICON: Record<ActivityType, LucideIcon> = {
  EMAIL: MailIcon,
  PHONE: PhoneIcon,
  MEETING: CalendarIcon,
  LINKEDIN: Share2Icon,
  WHATSAPP: MessageCircleIcon,
  NOTE: StickyNoteIcon,
  PROPOSAL: FileTextIcon,
  FOLLOW_UP: RotateCwIcon,
  STAGE_CHANGE: ArrowRightLeftIcon,
}

const TONE: Record<ActivityType, string> = {
  EMAIL: "bg-info/10 text-info",
  PHONE: "bg-info/10 text-info",
  MEETING: "bg-brand-muted text-brand-foreground",
  LINKEDIN: "bg-info/10 text-info",
  WHATSAPP: "bg-success/10 text-success",
  NOTE: "bg-muted text-muted-foreground",
  PROPOSAL: "bg-warning/15 text-warning-foreground",
  FOLLOW_UP: "bg-muted text-muted-foreground",
  STAGE_CHANGE: "bg-muted text-muted-foreground",
}

export function ActivityIcon({
  type,
  className,
}: {
  type: ActivityType
  className?: string
}) {
  const Icon = ICON[type]
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        TONE[type],
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}
