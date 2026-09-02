"use client"

import { useState, useTransition } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { changeOpportunityStage } from "@/features/opportunities/actions"

type Props = {
  target: { id: string; stageId: string } | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/**
 * Shown after an opportunity lands in a "Kaybedildi" stage. Entirely optional —
 * the stage change is already persisted; this just captures a reason if the
 * user wants to. Dismissing it is fine.
 */
export function LostReasonDialog({ target, onOpenChange, onSaved }: Props) {
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  // Reset the field each time the dialog is opened for a new target.
  const [prevTarget, setPrevTarget] = useState(target)
  if (target !== prevTarget) {
    setPrevTarget(target)
    if (target) setReason("")
  }

  function onSubmit() {
    if (!target) return
    startTransition(async () => {
      const result = await changeOpportunityStage(target.id, {
        stageId: target.stageId,
        lostReason: reason.trim(),
      })
      if (result.ok) {
        toast.success("Kayıp nedeni kaydedildi.")
        onSaved()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kayıp nedeni</DialogTitle>
          <DialogDescription>
            Fırsat kaybedildi olarak işaretlendi. İstersen kısa bir not
            bırakabilirsin — bu adımı atlayabilirsin.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={3}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Örn. Bütçe bu dönem ayrılamadı, gelecek sezon tekrar görüşülecek."
        />

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Atla
          </DialogClose>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending || reason.trim().length === 0}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
