"use client"

import { useState, useTransition } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

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
import { toLocalInputValue } from "@/lib/format"
import { logActivity } from "@/features/activities/actions"
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId?: string
  companyId?: string
  contacts?: ActivityContactOption[]
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
  onLogged,
}: Props) {
  const [channel, setChannel] = useState<ActivityChannel>("EMAIL")
  const [direction, setDirection] = useState<ActivityDirection>("OUTBOUND")
  const [kind, setKind] = useState<LoggableKind>("INITIAL_CONTACT")
  const [contactId, setContactId] = useState("")
  const [occurredAt, setOccurredAt] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setChannel("EMAIL")
      setDirection("OUTBOUND")
      setKind("INITIAL_CONTACT")
      setContactId("")
      setOccurredAt(toLocalInputValue(new Date()))
      setDescription("")
    }
  }

  const isInternal = channel === "INTERNAL"
  const selectedContact = contacts.find((c) => c.id === contactId)

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
      if (result.ok) {
        toast.success("İletişim kaydedildi.")
        onLogged(result.activity)
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İletişim ekle</DialogTitle>
          <DialogDescription>
            Yapılan bir görüşmeyi, mesajı veya notu kaydet. E-posta / LinkedIn
            türü mesaj göndermez — yalnızca kayıt oluşturur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Kanal</span>
              <select
                className={selectClass}
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as ActivityChannel)
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
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tür</span>
            <select
              className={selectClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as LoggableKind)}
            >
              {LOGGABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

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
            <span className="font-medium">Tarih ve saat</span>
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Not</span>
            <Textarea
              rows={4}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Konuşulanlar, sonraki adımlar…"
            />
          </label>
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
