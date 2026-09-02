"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import type { StageRef } from "@/lib/org/reference"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  currentStageId: string
  currentLostReason: string | null
  stages: StageRef[]
  onChanged: () => void
}

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"

export function StageChangeDialog({
  open,
  onOpenChange,
  opportunityId,
  currentStageId,
  currentLostReason,
  stages,
  onChanged,
}: Props) {
  const router = useRouter()
  const [stageId, setStageId] = useState(currentStageId)
  const [lostReason, setLostReason] = useState(currentLostReason ?? "")
  const [isPending, startTransition] = useTransition()

  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setStageId(currentStageId)
      setLostReason(currentLostReason ?? "")
    }
  }

  const targetIsLost =
    stages.find((s) => s.id === stageId)?.type === "LOST"

  function onSubmit() {
    startTransition(async () => {
      const result = await changeOpportunityStage(opportunityId, {
        stageId,
        lostReason: targetIsLost ? lostReason.trim() : undefined,
      })
      if (result.ok) {
        toast.success("Aşama güncellendi.")
        onOpenChange(false)
        router.refresh()
        onChanged()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aşamayı değiştir</DialogTitle>
          <DialogDescription>
            Fırsatın pipeline aşamasını güncelle. Değişiklik zaman çizelgesine
            otomatik olarak eklenir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Aşama</span>
            <select
              className={selectClass}
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {targetIsLost ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Kayıp nedeni</span>
              <Textarea
                rows={3}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Kısa bir açıklama (opsiyonel)"
              />
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </DialogClose>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
