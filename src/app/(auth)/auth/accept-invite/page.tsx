import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/db/prisma"
import { getUser } from "@/lib/auth/dal"
import { ORGANIZATION_ROLE_LABELS } from "@/lib/auth/permissions"
import { AcceptInviteForm } from "@/features/auth/components/accept-invite-form"

export const metadata: Metadata = { title: "Daveti Kabul Et" }

export default async function AcceptInvitePage() {
  const user = await getUser()

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Davet bağlantısı geçersiz
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Bu bağlantı geçersiz ya da süresi dolmuş. Yöneticinden yeni bir davet
          iste.
        </p>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          Girişe dön
        </Link>
      </div>
    )
  }

  const email = user.email.trim().toLowerCase()

  // Already a member? Nothing to accept.
  const membership = await prisma.organizationMembership.findFirst({
    where: { profile: { id: user.id }, deactivatedAt: null },
    select: { id: true },
  })
  if (membership) redirect("/dashboard")

  const invitation = await prisma.organizationInvitation.findFirst({
    where: { email, status: "PENDING" },
    select: {
      role: true,
      organization: { select: { name: true } },
    },
  })

  if (!invitation) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Aktif bir davetin yok
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {email} adresi için bekleyen bir davet bulunamadı. Erişim için bir
          yöneticinin seni davet etmesi gerekiyor.
        </p>
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          Girişe dön
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Hesabını tamamla
        </h1>
        <p className="text-muted-foreground text-sm">
          Panele giriş yapabilmek için bir şifre belirle.
        </p>
      </div>

      <AcceptInviteForm
        email={user.email}
        organizationName={invitation.organization.name}
        roleLabel={ORGANIZATION_ROLE_LABELS[invitation.role]}
      />
    </div>
  )
}
