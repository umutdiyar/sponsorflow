# SponsorFlow

Üniversite toplulukları ve öğrenci organizasyonları için sponsorluk CRM'i.
Şu an **AWS Student Builder Group at Okan University** sponsorluk ekibi
tarafından kullanılıyor.

## Amaç

Küçük bir sponsorluk ekibinin (5–10 kişi) günlük işini tek yerden, az tıklamayla
yürütmesini sağlamak:

- Firmaları ekip üyelerine dağıtmak ve kimde kaç firma olduğunu görmek.
- Atanmamış firmaları ve takip bekleyen firmaları hızlıca bulmak.
- Yapılan her görüşmeyi / mesajı kayıt altına almak.
- "Bu hafta şu firmalara odaklanıyoruz" listesini takip etmek.
- Sponsorluk sürecini (fırsat → pipeline → kapanış) şeffaf tutmak ve gelecek
  ekiplere temiz bir geçmiş bırakmak.

## Ana özellikler

- **Kimlik & çok kiracılılık:** Supabase Auth, davet ile üyelik, rol bazlı
  yetki (VIEWER → MEMBER → SPONSORSHIP_LEAD → ADMIN → OWNER).
- **Firmalar & kişiler:** liste, hızlı görünüm, sahiplik atama, hızlı filtreler
  (Bana atanan / Atanmamış / Takip gereken / Bu haftanın odağı).
- **İletişim kaydı:** kanal / tür / yön ekseninde aktivite; hazır şablonlarla
  tek tıkla giriş; kişilerden doğrudan "İletişim Kaydet".
- **Haftalık odak:** haftanın hedef firma listesi; ilerleme (iletişime geçildi /
  dönüş / görüşme) Activity verisinden türetilir.
- **Fırsatlar & pipeline:** sürükle-bırak aşama yönetimi, sade kartlar,
  sonraki aksiyon ve erteleme kısayolları.
- **Görevler:** liste ve plan görünümü, ilerlemeli form (temel alanlar + "Diğer
  ayrıntılar").
- **Sponsorluk paketleri:** yeniden kullanılabilir tier tanımları.
- **İçe / dışa aktarma:** CSV & Excel ile firma içe aktarma sihirbazı (kolon
  eşleştirme, doğrulama, tekrar kontrolü); firma / kişi / fırsat dışa aktarma.
- **Ekip yönetimi:** davet, rol değişikliği, üye çıkarma; çıkarılan üyenin
  firmaları "atanmamış"a düşer.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict)
- **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`)
- **PostgreSQL** (Supabase)
- **Supabase Auth** (`@supabase/ssr`)
- **Tailwind CSS 4**, Radix + Base UI primitifleri, `cmdk`, `@dnd-kit`
- **pnpm**

## Local Setup

```bash
pnpm install
cp .env.example .env      # değerleri kendi Supabase projenle doldur
pnpm db:deploy            # bekleyen migration'ları uygula
pnpm dev                  # http://localhost:3000
```

Ayrıntılı üretim kurulumu (SMTP, redirect URL'ler, e-posta şablonu) için
**[`docs/setup.md`](docs/setup.md)**.

## Environment

`.env` içinde gereken anahtarlar (şablon: `.env.example`):

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) anahtar — tarayıcıya gider |
| `SUPABASE_SECRET_KEY` | Service_role anahtarı — yalnızca sunucu, repoya yazılmaz |
| `DATABASE_URL` | Runtime bağlantısı (Transaction Pooler, port 6543) |
| `DIRECT_URL` | Migration bağlantısı (Session Pooler, port 5432) |
| `NEXT_PUBLIC_APP_URL` | Uygulamanın herkese açık kök adresi |

> Bu depoda gerçek anahtar / şifre tutulmaz. Tüm sırlar ortam değişkeni veya
> Supabase Dashboard üzerinden verilir.

## Database

- Şema: [`prisma/schema.prisma`](prisma/schema.prisma)
- Migration'lar yalnızca **eklemeli (additive)**. Akış:

```bash
npx prisma migrate diff \
  --from-schema-datamodel <HEAD schema> \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<ts>_<ad>/migration.sql
# migration.sql'i gözden geçir, sonra:
npx prisma migrate deploy
npx prisma generate
```

> `prisma migrate dev` / `prisma migrate reset` **kullanılmaz**.

## Supabase

- **Auth:** e-posta + şifre; davet akışı Auth Admin API (`inviteUserByEmail`).
- **Üretimde özel SMTP zorunlu** — kurulum `docs/setup.md` bölüm 2'de.
- **Redirect URL allow list'e** `<app-url>/auth/confirm` eklenmeli.
- Mevcut bölge `ap-south-1` (Mumbai); İstanbul'a yakın bir AB bölgesine geçiş
  değerlendirmesi: [`docs/supabase-region-migration.md`](docs/supabase-region-migration.md).

## Commands

| Komut | İş |
| --- | --- |
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` | `prisma generate` + üretim derlemesi |
| `pnpm start` | Üretim sunucusu |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier (yazar) |
| `pnpm db:deploy` | `prisma migrate deploy` |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | Örnek veri |

## Current Status

Kullanımda olan modüller: kimlik & çok kiracılı temel, RBAC, firmalar & kişiler,
fırsatlar & pipeline, aktivite/iletişim kaydı, görevler, sponsorluk paketleri,
haftalık odak, ekip davetleri, firma içe aktarma (CSV/XLSX) ve firma/kişi/fırsat
dışa aktarma, operasyon odaklı dashboard.

Kapsam dışı (bilinçli olarak yok): otomatik e-posta gönderimi, LinkedIn/takvim
entegrasyonu, bildirim altyapısı, kampanya modülü, yapay zeka, gelişmiş
analitik, satış tahmini, herkese açık kayıt.
