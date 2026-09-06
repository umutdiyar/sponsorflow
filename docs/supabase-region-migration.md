# Supabase Bölge (Region) Değişikliği — Değerlendirme Notu

> Bu bir **plan / değerlendirme** dokümanıdır. Bu iterasyonda altyapı taşıması
> **yapılmıyor**. Amaç, ileride yapılacaksa nedenini, zamanını ve kapsamını
> önceden netleştirmek.

## Mevcut durum

- Supabase projesi bölgesi: **`ap-south-1` (Mumbai, Hindistan)**.
- Postgres, Auth ve (varsa) Storage aynı bölgede çalışıyor.
- Ekip ve kullanıcılar ağırlıklı olarak **Türkiye / İstanbul**'da.

## Neden değiştirilebilir

- **Gecikme (latency):** İstanbul ↔ Mumbai gidiş-dönüş ~110–140 ms. Her sayfa
  birden çok sıralı sorgu çalıştırdığında bu, kullanıcıya hissedilir yavaşlık
  olarak yansır. İstanbul'a yakın bir Avrupa bölgesi (`eu-central-1` /
  Frankfurt veya `eu-central-2` / Zürih) tur başına ~30–50 ms'ye iner.
- **Veri yerleşimi (data residency):** Kullanıcı ve firma verisinin AB
  sınırları içinde tutulması, KVKK/GDPR uyumu ve kurumsal sponsorlarla
  yapılacak sözleşmeler açısından daha savunulabilir.
- **Operasyonel yakınlık:** Ekip, yedek/geri yükleme ve destek pencereleri
  Avrupa saatleriyle daha uyumlu olur.

## Önerilen hedef

- **`eu-central-1` (Frankfurt)** — İstanbul'a en yakın, en olgun ve en geniş
  hizmet kapsamına sahip Supabase bölgesi. Alternatif: `eu-central-2` (Zürih).

## Ne zaman yapılmalı

Aşağıdakilerden biri gerçekleştiğinde planlanmalı:

1. Aktif kullanıcı sayısı düzenli olarak 10'u aşıp panel açılış süresinden
   şikâyet gelmeye başladığında.
2. Bir sponsorla veri yerleşimini (AB) şart koşan bir sözleşme gündeme
   geldiğinde.
3. Prod veritabanı boyutu, kısa bir bakım penceresinde (dump/restore ~15–30 dk)
   taşınamayacak kadar büyümeden **önce** (şu an küçük — fırsat penceresi açık).

Taşıma, düşük trafikli bir zaman diliminde (ör. hafta sonu sabahı) ve önceden
duyurulmuş **kısa bir bakım penceresiyle** yapılmalı.

## Hangi data taşınır

| Bileşen | İçerik | Taşıma yöntemi |
| --- | --- | --- |
| Postgres | Tüm uygulama verisi: `Organization`, `OrganizationMembership`, `Company`, `Contact`, `Opportunity`, `Activity`, `Task`, `SponsorshipPackage`, `WeeklyFocus*`, `DataImport`, `OrganizationInvitation` | `pg_dump` → yeni projede `pg_restore` (veya Supabase'in proje taşıma aracı) |
| Auth | `auth.users`, kimlikler, e-posta doğrulama durumları | Supabase migration aracı / `auth` şeması dahil dump. Kullanıcı ID'leri (`profileId`) korunmalı — uygulama tüm üyelikleri buna bağlıyor. |
| Storage | Kulüp logosu vb. (kullanılıyorsa) | Bucket kopyalama |
| Ortam değişkenleri | `NEXT_PUBLIC_SUPABASE_URL`, anahtarlar, `DATABASE_URL`, `DIRECT_URL` | Yeni projedeki değerlerle güncellenir |
| Auth ayarları | SMTP, Redirect URL allow list, e-posta şablonları | `docs/setup.md` bölüm 2'ye göre yeni projede tekrar kurulur |

### Kritik noktalar

- **Kullanıcı ID sürekliliği:** `auth.users.id` değerleri yeni projede
  değişmemeli; yoksa `OrganizationMembership.profileId` bağları kopar.
- **Kesinti:** Taşıma sırasında yazma trafiği durdurulmalı (kısa read-only
  pencere), sonra DNS/ortam değişkeni yeni projeye çevrilmeli.
- **Geri dönüş planı:** Eski proje, yeni proje doğrulanana kadar (ör. 1 hafta)
  silinmemeli.
- **Migration geçmişi:** `prisma/migrations` klasörü yeni veritabanına
  `prisma migrate deploy` ile uygulanır; şema aynı kalır.
