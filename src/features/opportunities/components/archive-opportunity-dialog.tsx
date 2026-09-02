"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { archiveOpportunity } from "@/features/opportunities/actions"

type Props = {
  target: { id: string; title: string } | null
  onOpenChange: (open: boolean) => void
  redirectTo?: string
}

export function ArchiveOpportunityDialog({
  target,
  onOpenChange,
  redirectTo,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function onConfirm() {
    if (!target) return
    startTransition(async () => {
      const result = await archiveOpportunity(target.id)
      if (result.ok) {
        toast.success("Fırsat arşivlendi.")
        onOpenChange(false)
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fırsatı arşivle</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{target?.title}</span> arşivlenecek.
            Pipeline ve listelerden kaldırılır; verileri silinmez.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" />}
            disabled={isPending}
          >
            Vazgeç
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Arşivle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
