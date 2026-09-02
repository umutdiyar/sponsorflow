import Link from "next/link"

import { Wordmark } from "@/components/brand/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center px-6">
        <Link href="/login" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="text-muted-foreground px-6 py-6 text-center text-xs">
        AWS Student Builder Group at Istanbul Okan University için geliştirildi.
      </footer>
    </div>
  )
}
