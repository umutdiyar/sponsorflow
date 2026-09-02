import { Wordmark } from "@/components/brand/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr] xl:grid-cols-2">
      {/* Hero — brand surface, desktop only */}
      <aside className="bg-sidebar text-sidebar-foreground auth-hero-pattern relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div
          aria-hidden
          className="bg-brand/15 pointer-events-none absolute -top-32 -right-24 size-96 rounded-full blur-3xl"
        />
        <Wordmark className="relative" />

        <div className="relative flex max-w-md flex-col gap-4">
          <h2 className="font-heading text-2xl leading-snug font-semibold tracking-tight xl:text-3xl">
            Sponsorluk süreçlerini tek merkezden yönet.
          </h2>
          <p className="text-sidebar-foreground/70 text-sm leading-relaxed">
            Firmaları, iletişimleri ve ekip çalışmalarını düzenli bir şekilde
            takip et.
          </p>
        </div>

        <div className="text-sidebar-foreground/60 relative flex flex-col gap-0.5 text-xs">
          <span className="text-sidebar-foreground/80 font-medium">
            AWS Student Builder Group
          </span>
          <span>Istanbul Okan University</span>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex flex-col">
        <header className="flex h-14 items-center px-6 lg:hidden">
          <Wordmark />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer className="text-muted-foreground px-6 py-6 text-center text-xs lg:text-left">
          AWS Student Builder Group at Istanbul Okan University için
          geliştirildi.
        </footer>
      </main>
    </div>
  )
}
