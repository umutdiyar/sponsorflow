# SponsorFlow — Kurulum ve Üretim Ayarları

Bu doküman SponsorFlow'un yerel geliştirme ve üretim (production) ortamında
çalışması için gereken adımları anlatır. **Hiçbir gerçek anahtar / şifre bu
dosyada tutulmaz** — tüm değerler ortam değişkeni olarak verilir.

## 1. Ortam değişkenleri

`.env` dosyası (yerelde) veya hosting sağlayıcısının ortam değişkenleri
(üretimde) şu anahtarları içermelidir:

| Değişken | Açıklama |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) anahtarı. Tarayıcıya gider, gizli değildir. |
| `SUPABASE_SECRET_KEY` | Supabase **service_role / secret** anahtarı. Yalnızca sunucuda kullanılır (`src/lib/supabase/admin.ts`). **Asla istemci paketine girmemeli, asla repoya yazılmamalı.** |
| `DATABASE_URL` | Runtime bağlantısı — Supabase **Transaction Pooler** (port `6543`, `?pgbouncer=true`). |
| `DIRECT_URL` | Migration / Prisma CLI bağlantısı — Supabase **Session Pooler** (port `5432`). |
| `NEXT_PUBLIC_APP_URL` | Uygulamanın herkese açık kök adresi (ör. `https://sponsorflow.example.com`). Davet e-postalarındaki dönüş bağlantısı bundan üretilir. Yerelde `http://localhost:3000`. |

`.env.example` şablon olarak kullanılabilir. Kişisel geliştirme anahtarlarını
`.env` içine koy, `.env`'i commit etme.

## 2. Davet e-postaları (Supabase Auth)

Ekip daveti akışı (`src/features/team/actions.ts` → `sendSupabaseInvite`)
Supabase Auth Admin API'sindeki `inviteUserByEmail` çağrısını kullanır.
E-postayı **Supabase gönderir**, uygulama kendi başına e-posta göndermez.

### 2.1. Üretimde zorunlu: kendi SMTP sağlayıcın

Supabase'in dahili (built-in) e-posta servisi yalnızca geliştirme içindir:
saatte çok düşük bir gönderim limiti vardır ve yalnızca proje üyelerine
teslim edilmesi garanti edilir. Üretimde davetlerin gerçekten ulaşması için
**Supabase Dashboard → Project Settings → Authentication → SMTP Settings**
bölümünden özel bir SMTP sağlayıcı tanımlanmalıdır:

1. Bir e-posta sağlayıcısı seç (Resend, Amazon SES, Postmark, SendGrid, Brevo…).
2. Sağlayıcıdan SMTP host / port / kullanıcı adı / şifre bilgilerini al.
3. Supabase SMTP ayarlarına gir:
   - **Sender email:** ör. `sponsorluk@okanaws.org` (alan adı doğrulanmış olmalı)
   - **Sender name:** `SponsorFlow — AWS Student Builder Group at Okan University`
   - Host / Port / Username / Password: sağlayıcıdan gelen değerler
4. Sağlayıcı panelinde alan adı için SPF, DKIM (ve mümkünse DMARC) kayıtlarını
   ekle — aksi halde davetler spam'e düşer.

> SMTP kimlik bilgileri **yalnızca Supabase Dashboard'da** tutulur. Bu repoda
> veya `.env` dosyasında SMTP şifresi bulunmamalıdır.

### 2.2. Redirect URL yapılandırması

**Supabase Dashboard → Authentication → URL Configuration:**

- **Site URL:** `NEXT_PUBLIC_APP_URL` ile aynı (ör. `https://sponsorflow.example.com`).
- **Redirect URLs (allow list):** en az şunlar:
  - `http://localhost:3000/auth/confirm`
  - `https://<üretim-alanı>/auth/confirm`
  - Kullanılan her önizleme (preview) alanı için `/auth/confirm`

Davet çağrısı `redirectTo` olarak `${NEXT_PUBLIC_APP_URL}/auth/confirm`
gönderir; bu adres allow list'te yoksa Supabase bağlantıyı reddeder.

### 2.3. E-posta şablonu

**Supabase Dashboard → Authentication → Email Templates → "Invite user":**

- Konu (subject): sade tut — ör. `SponsorFlow ekibine davet edildin`
- Gövde: kısa bir karşılama + `{{ .ConfirmationURL }}` bağlantısı yeterli.
- Kurumsal kimlik: gönderen adı **"SponsorFlow — AWS Student Builder Group at
  Okan University"**. Şablon içinde uzun pazarlama metni kullanma.

### 2.4. Uygulamanın davet hatalarını ele alışı

- E-posta gönderilemezse davet kaydı yine de oluşturulur; kullanıcıya
  **"Davet kaydedildi ancak e-posta gönderilemedi."** gösterilir ve ekip
  listesinde "Bekliyor" satırı görünür, oradan **yeniden gönderilebilir**.
- E-posta zaten Supabase'de kayıtlıysa davet kaydı beklemede kalır ve kullanıcı
  giriş yaptığında `src/lib/auth/membership.ts` içindeki provisyon akışı
  tarafından otomatik kabul edilir.
- Ham Supabase hata mesajı **hiçbir zaman** kullanıcıya gösterilmez
  (`sendSupabaseInvite` bunları Türkçe mesaja çevirir, ayrıntı `console.error`).

## 3. Veritabanı (Prisma + Supabase Postgres)

Migration akışı (shadow DB kullanılmaz):

```bash
# 1. Şemayı düzenle: prisma/schema.prisma
# 2. Fark SQL'i üret (HEAD'deki şema ile karşılaştır)
npx prisma migrate diff \
  --from-schema-datamodel <HEAD'deki schema.prisma> \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<zaman_damgası>_<ad>/migration.sql
# 3. migration.sql'i gözden geçir (yalnızca additive: CREATE / ADD)
# 4. Uygula
npx prisma migrate deploy
npx prisma generate
```

> `prisma migrate dev` ve `prisma migrate reset` **kullanılmaz** — üretim
> verisini düşürebilir. Migration'lar yalnızca eklemeli (additive) olmalıdır.

## 4. İlk kullanıcı ve organizasyon

İlk giriş yapan kullanıcı otomatik olarak bir organizasyon ve `OWNER`
üyeliği alır (`provisionMembership`). Sonraki kullanıcılar yalnızca kendileri
için `PENDING`/`ACCEPTED` bir `OrganizationInvitation` varsa katılabilir;
yoksa `ForbiddenError` alırlar. Herkese açık kayıt (public signup) yoktur.

## 5. Yerel çalıştırma

```bash
pnpm install
# .env dosyasını doldur (bkz. bölüm 1)
pnpm db:deploy      # bekleyen migration'ları uygula
pnpm dev            # http://localhost:3000
```

Üretim derlemesi:

```bash
pnpm build
pnpm start
```
