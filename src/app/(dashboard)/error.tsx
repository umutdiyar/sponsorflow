"use client"

import { useEffect } from "react"

import { ErrorState } from "@/components/common/error-state"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <ErrorState
        description="Bu sayfa yüklenirken bir hata oluştu. Tekrar denemeyi seçebilir ya da daha sonra kontrol edebilirsin."
        onRetry={reset}
      />
      {process.env.NODE_ENV === "development" ? (
        <pre className="bg-muted text-muted-foreground max-h-48 overflow-auto rounded-md p-3 text-left text-xs whitespace-pre-wrap">
          {error.message}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      ) : null}
    </div>
  )
}
