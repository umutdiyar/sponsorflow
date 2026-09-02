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
import { archiveCompany } from "@/features/companies/actions"

type ArchiveCompanyDialogProps = {
  target: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  /** Where to go after archiving (list stays put by default). */
  redirectTo?: string
}

export function ArchiveCompanyDialog({
  target,
  onOpenChange,
  redirectTo,
}: ArchiveCompanyDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function onConfirm() {
    if (!target) return
    startTransition(async () => {
      const result = await archiveCompany(target.id)
      if (result.ok) {
        toast.success("Firma arşivlendi.")
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
          <DialogTitle>Firmayı arşivle</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{target?.name}</span> arşivlenecek.
            Firma listelerden kaldırılır ancak verileri silinmez; ileride geri
            alınabilir.
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
