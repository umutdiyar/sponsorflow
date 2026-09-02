import { requireUser } from "@/lib/auth/dal"
import { CURRENT_ORGANIZATION } from "@/lib/organization"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <AppShell user={user} orgName={CURRENT_ORGANIZATION.name}>
      {children}
    </AppShell>
  )
}
