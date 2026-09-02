"use client"

import { AlertTriangleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description = "Veriler yüklenirken bir hata oluştu. Lütfen tekrar dene.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-12 text-center",
        className
      )}
    >
      <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-lg">
        <AlertTriangleIcon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {description}
        </p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          Tekrar dene
        </Button>
      ) : null}
    </div>
  )
}
