import {
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  Share2Icon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type {
  ActivityChannel,
  ActivityDirection,
} from "@/generated/prisma/enums"

const ICON: Record<ActivityChannel, LucideIcon> = {
  EMAIL: MailIcon,
  LINKEDIN: Share2Icon,
  WHATSAPP: MessageCircleIcon,
  PHONE: PhoneIcon,
  MEETING: CalendarIcon,
  OTHER: StickyNoteIcon,
  INTERNAL: StickyNoteIcon,
}

const TONE: Record<ActivityChannel, string> = {
  EMAIL: "bg-info/10 text-info",
  LINKEDIN: "bg-info/10 text-info",
  WHATSAPP: "bg-success/10 text-success",
  PHONE: "bg-info/10 text-info",
  MEETING: "bg-brand-muted text-brand-foreground",
  OTHER: "bg-muted text-muted-foreground",
  INTERNAL: "bg-muted text-muted-foreground",
}

const DIRECTION_ICON: Record<ActivityDirection, LucideIcon> = {
  OUTBOUND: ArrowUpRightIcon,
  INBOUND: ArrowDownLeftIcon,
  INTERNAL: ArrowRightLeftIcon,
}

export function ActivityIcon({
  channel,
  direction,
  className,
}: {
  channel: ActivityChannel
  direction?: ActivityDirection
  className?: string
}) {
  const Icon = ICON[channel]
  const DirIcon = direction ? DIRECTION_ICON[direction] : null
  return (
    <span className={cn("relative shrink-0", className)}>
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          TONE[channel]
        )}
      >
        <Icon className="size-3.5" />
      </span>
      {DirIcon && direction !== "INTERNAL" ? (
        <span className="bg-background text-muted-foreground absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full">
          <DirIcon className="size-2.5" />
        </span>
      ) : null}
    </span>
  )
}
