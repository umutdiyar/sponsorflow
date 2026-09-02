import { Wordmark } from "@/components/brand/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr] xl:grid-cols-2">
      {/* Hero — brand surface, desktop only. One identity, one org line. */}
      <aside className="bg-sidebar text-sidebar-foreground auth-hero-pattern relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div
          aria-hidden
          className="bg-brand/15 pointer-events-none absolute -top-32 -right-24 size-96 rounded-full blur-3xl"
        />
        <Wordmark className="relative" label="Sponsorluk CRM" size={34} />

        <div className="relative flex max-w-md flex-col gap-4">
          <h2 className="font-heading text-2xl leading-snug font-semibold tracking-tight xl:text-[1.75rem]">
            Sponsorluk süreçlerini tek merkezden yönet.
          </h2>
          <p className="text-sidebar-foreground/70 text-sm leading-relaxed">
            Firmaları, iletişimleri ve ekip çalışmalarını düzenli bir şekilde
            takip et.
          </p>
        </div>

        <p className="text-sidebar-foreground/55 relative text-xs">
          AWS Student Builder Group at Okan University
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-col">
        <header className="flex h-16 items-center px-6 lg:hidden">
          <Wordmark label="Sponsorluk CRM" size={30} />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="animate-in fade-in slide-in-from-bottom-3 w-full max-w-104 duration-300 ease-out motion-reduce:animate-none">
            {children}
          </div>
        </div>
        <footer className="text-muted-foreground px-6 py-6 text-center text-xs sm:px-10 lg:text-left">
          AWS Student Builder Group at Istanbul Okan University için
          geliştirildi.
        </footer>
      </main>
    </div>
  )
}
