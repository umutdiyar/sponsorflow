import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Şifreni mi unuttun?
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          SponsorFlow şu an yalnızca kulüp içi kullanımda ve e-posta ile şifre
          sıfırlama açık değil. Erişim sorunlarında organizasyon yöneticisinden
          (OWNER veya ADMIN) <span className="font-medium">Ekip</span> sayfasından
          sana yeni bir geçici şifre oluşturmasını iste. Giriş yaptıktan sonra
          şifreni <span className="font-medium">Ayarlar</span> bölümünden
          değiştirebilirsin.
        </p>
      </div>

      <Link
        href="/login"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeftIcon className="size-4" />
        Girişe dön
      </Link>
    </div>
  )
}
