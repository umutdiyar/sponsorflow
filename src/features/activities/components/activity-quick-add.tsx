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
  ACTIVITY_TYPE_LABELS,
  LOGGABLE_ACTIVITY_TYPES,
} from "@/features/activities/schema"
import type { ActivityListItem } from "@/features/activities/queries"

export type ActivityContactOption = { id: string; name: string }

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

export function ActivityQuickAdd({
  open,
  onOpenChange,
  opportunityId,
  companyId,
  contacts = [],
  onLogged,
}: Props) {
  const [type, setType] =
    useState<(typeof LOGGABLE_ACTIVITY_TYPES)[number]>("NOTE")
  const [occurredAt, setOccurredAt] = useState("")
  const [contactId, setContactId] = useState("")
  const [description, setDescription] = useState("")
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setType("NOTE")
      setOccurredAt(toLocalInputValue(new Date()))
      setContactId("")
      setDescription("")
    }
  }

  function onSubmit() {
    startTransition(async () => {
      const result = await logActivity({
        type,
        occurredAt,
        opportunityId,
        companyId,
        contactId: contactId || undefined,
        description: description || undefined,
      })
      if (result.ok) {
        toast.success("Aktivite kaydedildi.")
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
          <DialogTitle>Aktivite ekle</DialogTitle>
          <DialogDescription>
            Yapılan bir görüşmeyi, e-postayı veya notu kaydet. E-posta türü
            posta göndermez, yalnızca kayıt oluşturur.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tür</span>
            <select
              className={selectClass}
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as (typeof LOGGABLE_ACTIVITY_TYPES)[number]
                )
              }
            >
              {LOGGABLE_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_TYPE_LABELS[t]}
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
            </label>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Açıklama</span>
            <Textarea
              rows={4}
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görüşmede konuşulanlar, sonraki adımlar…"
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
