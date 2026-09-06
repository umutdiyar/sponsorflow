"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDownIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addDaysToKey, istanbulDayKey, toLocalInputValue } from "@/lib/format"
import { logActivity } from "@/features/activities/actions"
import { updateNextAction } from "@/features/opportunities/actions"
import {
  ACTIVITY_CHANNELS,
  ACTIVITY_CHANNEL_LABELS,
  ACTIVITY_DIRECTIONS,
  ACTIVITY_DIRECTION_LABELS,
  ACTIVITY_KIND_LABELS,
  LOGGABLE_KINDS,
} from "@/features/activities/schema"
import type {
  ActivityChannel,
  ActivityDirection,
} from "@/generated/prisma/enums"
import type { ActivityListItem } from "@/features/activities/queries"

export type ActivityContactOption = {
  id: string
  name: string
  email?: string | null
  linkedinUrl?: string | null
}

type LoggableKind = (typeof LOGGABLE_KINDS)[number]

type Preset = {
  label: string
  channel: ActivityChannel
  kind: LoggableKind
  direction: ActivityDirection
}

const PRESETS: Preset[] = [
  {
    label: "LinkedIn · İlk Temas",
    channel: "LINKEDIN",
    kind: "INITIAL_CONTACT",
    direction: "OUTBOUND",
  },
  {
    label: "E-posta · İlk Temas",
    channel: "EMAIL",
    kind: "INITIAL_CONTACT",
    direction: "OUTBOUND",
  },
  {
    label: "E-posta · Takip",
    channel: "EMAIL",
    kind: "FOLLOW_UP",
    direction: "OUTBOUND",
  },
  {
    label: "LinkedIn · Takip",
    channel: "LINKEDIN",
    kind: "FOLLOW_UP",
    direction: "OUTBOUND",
  },
  {
    label: "Telefon · Görüşme",
    channel: "PHONE",
    kind: "MEETING_NOTE",
    direction: "OUTBOUND",
  },
  {
    label: "Gelen Yanıt",
    channel: "EMAIL",
    kind: "RESPONSE",
    direction: "INBOUND",
  },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId?: string
  companyId?: string
  contacts?: ActivityContactOption[]
  /** Preselect a contact when the dialog opens (e.g. from the contacts list). */
  defaultContactId?: string
  onLogged: (activity: ActivityListItem) => void
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

export function QuickLogCommunication({
  open,
  onOpenChange,
  opportunityId,
  companyId,
  contacts = [],
  defaultContactId,
  onLogged,
}: Props) {
  const router = useRouter()
  const [channel, setChannel] = useState<ActivityChannel>("EMAIL")
  const [direction, setDirection] = useState<ActivityDirection>("OUTBOUND")
  const [kind, setKind] = useState<LoggableKind>("INITIAL_CONTACT")
  const [contactId, setContactId] = useState("")
  const [occurredAt, setOccurredAt] = useState("")
  const [description, setDescription] = useState("")
  const [showMore, setShowMore] = useState(false)
  const [followUp, setFollowUp] = useState(false)
  const [followNote, setFollowNote] = useState("")
  const [followDate, setFollowDate] = useState("")
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setChannel("EMAIL")
      setDirection("OUTBOUND")
      setKind("INITIAL_CONTACT")
      setContactId(defaultContactId ?? "")
      setOccurredAt(toLocalInputValue(new Date()))
      setDescription("")
      setShowMore(false)
      setFollowUp(false)
      setFollowNote("")
      setFollowDate(addDaysToKey(istanbulDayKey(new Date()), 3))
    }
  }

  const isInternal = channel === "INTERNAL"
  const selectedContact = contacts.find((c) => c.id === contactId)

  function applyPreset(p: Preset) {
    setChannel(p.channel)
    setKind(p.kind)
    setDirection(p.direction)
  }

  // Smart defaults: switching channel/kind nudges the direction.
  function onChannelChange(c: ActivityChannel) {
    setChannel(c)
    if (c === "INTERNAL") setDirection("INTERNAL")
    else if (direction === "INTERNAL") setDirection("OUTBOUND")
  }
  function onKindChange(k: LoggableKind) {
    setKind(k)
    if (k === "RESPONSE") setDirection("INBOUND")
  }

  function onSubmit() {
    startTransition(async () => {
      const result = await logActivity({
        channel,
        direction: isInternal ? "INTERNAL" : direction,
        kind,
        occurredAt,
        opportunityId,
        companyId,
        contactId: contactId || undefined,
        description: description || undefined,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      if (followUp && opportunityId && followNote.trim()) {
        const fu = await updateNextAction(opportunityId, {
          nextAction: followNote.trim(),
          nextActionAt: followDate || undefined,
        })
        toast.success(
          fu.ok
            ? "İletişim kaydedildi ve takip planlandı."
            : "İletişim kaydedildi (takip planlanamadı)."
        )
        if (fu.ok) router.refresh()
      } else {
        toast.success("İletişim kaydedildi.")
      }

      onLogged(result.activity)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İletişim kaydet</DialogTitle>
          <DialogDescription>
            Yapılan bir görüşmeyi, mesajı veya notu kaydet. Mesaj göndermez —
            yalnızca kayıt oluşturur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Presets */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const active =
                p.channel === channel &&
                p.kind === kind &&
                p.direction === (isInternal ? "INTERNAL" : direction)
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-brand bg-brand-muted text-brand-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Kanal</span>
              <select
                className={selectClass}
                value={channel}
                onChange={(e) =>
                  onChannelChange(e.target.value as ActivityChannel)
                }
              >
                {ACTIVITY_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {ACTIVITY_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Tür</span>
              <select
                className={selectClass}
                value={kind}
                onChange={(e) => onKindChange(e.target.value as LoggableKind)}
              >
                {LOGGABLE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ACTIVITY_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {contacts.length > 0 ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">İlgili kişi</span>
              <select
                className={selectClass}
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">Kişi seçilmedi</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedContact && channel === "EMAIL" && selectedContact.email ? (
                <span className="text-muted-foreground text-xs">
                  {selectedContact.email}
                </span>
              ) : null}
              {selectedContact &&
              channel === "LINKEDIN" &&
              selectedContact.linkedinUrl ? (
                <span className="text-muted-foreground truncate text-xs">
                  {selectedContact.linkedinUrl}
                </span>
              ) : null}
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Not</span>
            <Textarea
              rows={3}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Konuşulanlar, sonraki adımlar…"
            />
          </label>

          {/* Advanced */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="text-muted-foreground hover:text-foreground -mb-1 flex w-fit items-center gap-1 text-xs font-medium"
          >
            <ChevronDownIcon
              className={cn("size-3.5 transition-transform", showMore && "rotate-180")}
            />
            Diğer ayrıntılar
          </button>
          {showMore ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Yön</span>
                <select
                  className={selectClass}
                  value={isInternal ? "INTERNAL" : direction}
                  disabled={isInternal}
                  onChange={(e) =>
                    setDirection(e.target.value as ActivityDirection)
                  }
                >
                  {ACTIVITY_DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {ACTIVITY_DIRECTION_LABELS[d]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Tarih ve saat</span>
                <Input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {/* Follow-up (only meaningful when tied to an opportunity) */}
          {opportunityId ? (
            <div className="border-t pt-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                  className="size-4"
                />
                Takip planla
              </label>
              {followUp ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Input
                    value={followNote}
                    onChange={(e) => setFollowNote(e.target.value)}
                    placeholder="Örn. Teklif dokümanını gönder"
                  />
                  <Input
                    type="date"
                    value={followDate}
                    onChange={(e) => setFollowDate(e.target.value)}
                    className="w-40"
                  />
                  <p className="text-muted-foreground text-xs">
                    Fırsatın “sonraki aksiyonu” olarak kaydedilir.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </DialogClose>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending || !occurredAt}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
