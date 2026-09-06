/**
 * Field catalogue + normalization for the company importer. Shared by the
 * client wizard and the server actions so both agree on what a "column" means.
 */

export type ImportFieldKey =
  | "name"
  | "industry"
  | "website"
  | "linkedinUrl"
  | "city"
  | "country"
  | "source"
  | "ownerName"
  | "contactFirstName"
  | "contactLastName"
  | "contactEmail"
  | "contactLinkedinUrl"

export type ImportField = {
  key: ImportFieldKey
  label: string
  group: "company" | "contact"
  required?: boolean
  /** Lowercased header fragments that auto-map to this field. */
  aliases: string[]
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "Firma Adı",
    group: "company",
    required: true,
    aliases: ["firma", "firma adı", "şirket", "sirket", "company", "name", "unvan"],
  },
  {
    key: "industry",
    label: "Sektör",
    group: "company",
    aliases: ["sektör", "sektor", "industry", "alan", "kategori"],
  },
  {
    key: "website",
    label: "Web Sitesi",
    group: "company",
    aliases: ["web", "web sitesi", "site", "website", "url", "internet sitesi"],
  },
  {
    key: "linkedinUrl",
    label: "LinkedIn",
    group: "company",
    aliases: ["linkedin", "linkedin url", "linkedin sayfası"],
  },
  {
    key: "city",
    label: "Şehir",
    group: "company",
    aliases: ["şehir", "sehir", "city", "il"],
  },
  {
    key: "country",
    label: "Ülke",
    group: "company",
    aliases: ["ülke", "ulke", "country"],
  },
  {
    key: "source",
    label: "Kaynak",
    group: "company",
    aliases: ["kaynak", "source", "geliş kanalı"],
  },
  {
    key: "ownerName",
    label: "Sorumlu",
    group: "company",
    aliases: ["sorumlu", "owner", "atanan", "temsilci", "sahibi"],
  },
  {
    key: "contactFirstName",
    label: "Yetkili Adı",
    group: "contact",
    aliases: ["yetkili ad", "yetkili adı", "ad", "isim", "first name", "kişi adı"],
  },
  {
    key: "contactLastName",
    label: "Yetkili Soyadı",
    group: "contact",
    aliases: ["yetkili soyad", "yetkili soyadı", "soyad", "last name"],
  },
  {
    key: "contactEmail",
    label: "Yetkili E-posta",
    group: "contact",
    aliases: ["mail", "e-posta", "eposta", "email", "yetkili mail", "e-mail"],
  },
  {
    key: "contactLinkedinUrl",
    label: "Yetkili LinkedIn",
    group: "contact",
    aliases: ["yetkili linkedin", "kişi linkedin", "contact linkedin"],
  },
]

export const IMPORT_FIELD_LABELS: Record<ImportFieldKey, string> =
  Object.fromEntries(
    IMPORT_FIELDS.map((f) => [f.key, f.label])
  ) as Record<ImportFieldKey, string>

/** Best-guess column index for each field from the file's header row. */
export function autoMap(headers: string[]): Partial<Record<ImportFieldKey, number>> {
  const norm = headers.map((h) => h.trim().toLowerCase())
  const used = new Set<number>()
  const map: Partial<Record<ImportFieldKey, number>> = {}

  for (const field of IMPORT_FIELDS) {
    let bestIdx = -1
    let bestScore = 0
    norm.forEach((h, i) => {
      if (used.has(i) || !h) return
      for (const alias of field.aliases) {
        const score = h === alias ? 3 : h.includes(alias) ? 2 : 0
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
        }
      }
    })
    if (bestIdx >= 0) {
      map[field.key] = bestIdx
      used.add(bestIdx)
    }
  }
  return map
}

const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "i",
  ş: "s",
  Ş: "s",
  ğ: "g",
  Ğ: "g",
  ü: "u",
  Ü: "u",
  ö: "o",
  Ö: "o",
  ç: "c",
  Ç: "c",
}

/** Fold Turkish letters + case + whitespace for name comparison. */
export function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .replace(/\b(a\.?ş\.?|a\.?s\.?|ltd\.?|şti\.?|sti\.?|inc\.?|llc\.?|gmbh)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Prefix a bare host with https:// and lightly validate. Returns null if unusable. */
export function coerceUrl(value: string | undefined): string | null {
  const v = value?.trim()
  if (!v) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes(".")) return null
    return u.toString()
  } catch {
    return null
  }
}

/** Registrable-ish domain for duplicate matching: lowercased host, no www. */
export function domainOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null
  } catch {
    return null
  }
}
