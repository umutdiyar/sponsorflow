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
| `NEXT_PUBLIC_APP_URL` | Uygulamanın herkese açık kök adresi (ör. `https://sponsorflow.example.com`). Yerelde `http://localhost:3000`. |

`.env.example` şablon olarak kullanılabilir. Kişisel geliştirme anahtarlarını
`.env` içine koy, `.env`'i commit etme.

## 2. Ekip üyesi ekleme — doğrudan hesap oluşturma

**Ürün kararı: SponsorFlow yalnızca kulüp içi ekip tarafından kullanılır, bu
nedenle SMTP / e-posta daveti gerekmez.** OWNER / ADMIN / Sponsorluk Lideri,
**Ekip → Ekip Üyesi Ekle** ile hesabı anında oluşturur:

1. Ad Soyad, e-posta, rol ve bir **geçici şifre** girilir (form güçlü şifre
   üretebilir).
2. Sunucu tarafı (`src/features/team/actions.ts` → `createMember`):
   - `requirePermission("invitation:create")` + `canGrantRole` ile rol kontrolü,
   - aynı e-postayla mevcut hesap kontrolü,
   - `supabase.auth.admin.createUser({ email, password, email_confirm: true,
     user_metadata: { full_name } })` — **e-posta doğrulaması gerekmez, hiçbir
     e-posta gönderilmez**,
   - Prisma transaction ile `Profile` + `OrganizationMembership` (organizasyon
     id'si aktör üyeliğinden; istemciden alınmaz),
   - transaction başarısız olursa `supabase.auth.admin.deleteUser` ile Auth
     kullanıcısı temizlenir (telafi/compensation).
3. Üye, verilen e-posta + geçici şifre ile **normal `/login`** ekranından girer.
   İlk girişten sonra **Ayarlar → Şifre Değiştir** ile şifresini değiştirir.

**Şifre işleme:** geçici şifre **yalnızca oluşturma sırasında bir kez** UI'da
gösterilir (Göster / Kopyala). Veritabanına, activity/audit log'a, console'a ya
da server log'a **plaintext yazılmaz**. Pencere kapandıktan sonra tekrar
görüntülenemez.

**Geçici şifre sıfırlama:** OWNER / ADMIN, Ekip sayfasından bir üye için
`supabase.auth.admin.updateUserById(userId, { password })` çağrısıyla yeni
geçici şifre atayabilir (Sponsorluk Lideri yapamaz). Yeni şifre yine bir kez
gösterilir.

## 2b. SMTP (opsiyonel — ileride)

Bu iterasyonda SMTP **gerekli değildir**. İleride e-posta ile davet veya "şifremi
unuttum" akışı istenirse **Supabase Dashboard → Project Settings → Authentication
→ SMTP Settings** üzerinden özel bir sağlayıcı (Resend, Amazon SES, Postmark…)
tanımlanır; sender name **"SponsorFlow — AWS Student Builder Group at Okan
University"**, alan adı için SPF/DKIM kayıtları eklenir. E-posta tabanlı bir akış
eklenirse **Authentication → URL Configuration → Redirect URLs** listesine
`<app-url>/auth/confirm` eklenmelidir. SMTP kimlik bilgileri yalnızca Supabase
Dashboard'da tutulur, repoda veya `.env`'de bulunmaz.

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
üyeliği alır (`provisionMembership`). Sonraki ekip üyeleri **doğrudan hesap
oluşturma** ile eklenir (bkz. bölüm 2) — bu akış `Profile` + `Membership`
kayıtlarını önceden yazdığı için üye ilk girişinde `provisionMembership`
çalışmaz. Herkese açık kayıt (public signup) yoktur; üyeliği olmayan bir
kullanıcı `ForbiddenError` alır.

`OrganizationInvitation` modeli ve `provisionMembership` içindeki davet
kontrolü, daha önce üretilmiş davetler için **geriye dönük uyumluluk amacıyla**
korunur; günlük akışta kullanılmaz.

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
