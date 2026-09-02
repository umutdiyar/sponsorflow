import { requireUser } from "@/lib/auth/dal"
import { getCurrentMembership } from "@/lib/auth/membership"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, membership] = await Promise.all([
    requireUser(),
    getCurrentMembership(),
  ])

  return (
    <AppShell
      user={{ ...user, role: membership.roleLabel }}
      org={{
        name: membership.organization.name,
        subtitle: "Istanbul Okan University",
      }}
    >
      {children}
    </AppShell>
  )
}
