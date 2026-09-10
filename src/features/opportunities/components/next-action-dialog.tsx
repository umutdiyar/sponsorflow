"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { addDaysToKey, istanbulDayKey, toDateInputValue } from "@/lib/format"
import { updateNextAction } from "@/features/opportunities/actions"

const RESCHEDULE = [
  { label: "Yarına ertele", days: 1 },
  { label: "Gelecek haftaya ertele", days: 7 },
] as const

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  nextAction: string | null
  nextActionAt: Date | null
  onSaved: () => void
}

export function NextActionDialog({
  open,
  onOpenChange,
  opportunityId,
  nextAction,
  nextActionAt,
  onSaved,
}: Props) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [date, setDate] = useState("")
  const [isPending, startTransition] = useTransition()

  // Seed the fields from the opportunity whenever the dialog opens.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setText(nextAction ?? "")
      setDate(nextActionAt ? toDateInputValue(nextActionAt) : "")
    }
  }

  function save(
    mode: "save" | "clear" | "done" = "save",
    overrideDate?: string
  ) {
    const clear = mode !== "save"
    startTransition(async () => {
      const result = await updateNextAction(opportunityId, {
        nextAction: clear ? "" : text,
        nextActionAt: clear ? "" : (overrideDate ?? date),
      })
      if (result.ok) {
        toast.success(
          mode === "done"
            ? "Aksiyon tamamlandı olarak işaretlendi."
            : mode === "clear"
              ? "Sonraki aksiyon temizlendi."
              : "Kaydedildi."
        )
        onOpenChange(false)
        router.refresh()
        onSaved()
      } else {
        toast.error(result.error)
      }
    })
  }

  const today = istanbulDayKey(new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sonraki aksiyon</DialogTitle>
          <DialogDescription>
            Bu süreç için üzerinde anlaşılan tek sonraki adımı yaz.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Aksiyon</span>
            <Textarea
              rows={3}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Örn. Teklif dokümanını gönder ve toplantı ayarla"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tarih</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {nextAction ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {RESCHEDULE.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  disabled={isPending}
                  onClick={() => save("save", addDaysToKey(today, r.days))}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                >
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                disabled={isPending}
                onClick={() => save("done")}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-full border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
              >
                Tamamlandı
              </button>
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          {nextAction ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => save("clear")}
              disabled={isPending}
            >
              Temizle
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogClose
              render={<Button type="button" variant="outline" />}
              disabled={isPending}
            >
              Vazgeç
            </DialogClose>
            <Button
              type="button"
              onClick={() => save("save")}
              disabled={isPending}
            >
              {isPending ? <Loader2Icon className="animate-spin" /> : null}
              Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
