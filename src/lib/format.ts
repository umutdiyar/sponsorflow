/**
 * Locale + timezone formatting helpers. The app presents every date in
 * Europe/Istanbul regardless of where the server runs; the database stores
 * UTC. All labels are Turkish (`tr-TR`).
 */

const TZ = "Europe/Istanbul"

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TZ,
})

const dateLongFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
})

const dayMonthFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: TZ,
})

const timeFmt = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
})

const weekdayFmt = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  timeZone: TZ,
})

const weekdayShortFmt = new Intl.DateTimeFormat("tr-TR", {
  weekday: "short",
  timeZone: TZ,
})

const isoDayFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
})

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** "2 Eyl 2026" */
export function formatDate(value: DateInput): string {
  return dateFmt.format(toDate(value))
}

/** "2 Eylül 2026" */
export function formatDateLong(value: DateInput): string {
  return dateLongFmt.format(toDate(value))
}

/** "2 Eyl" — no year, for dense agenda headers within the current period. */
export function formatDayMonth(value: DateInput): string {
  return dayMonthFmt.format(toDate(value))
}

/** "14:30" */
export function formatTime(value: DateInput): string {
  return timeFmt.format(toDate(value))
}

/** "2 Eyl 2026, 14:30" */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value)
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`
}

/** "Pazartesi" */
export function formatWeekday(value: DateInput): string {
  return weekdayFmt.format(toDate(value))
}

/** "Pzt" */
export function formatWeekdayShort(value: DateInput): string {
  return weekdayShortFmt.format(toDate(value))
}

/** Calendar day in Istanbul as "2026-09-02" — safe key for grouping/DnD. */
export function istanbulDayKey(value: DateInput): string {
  return isoDayFmt.format(toDate(value))
}

/** Whole calendar days from *today* (Istanbul). Negative = past. */
export function daysFromToday(value: DateInput): number {
  return dayKeyDiff(istanbulDayKey(new Date()), istanbulDayKey(value))
}

/** Whole calendar days between two "YYYY-MM-DD" keys (`to - from`). */
export function dayKeyDiff(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000
  )
}

/** Add `n` days to a "YYYY-MM-DD" key, returning a new key. */
export function addDaysToKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + n))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(next.getUTCDate()).padStart(2, "0")}`
}

/** "Bugün" / "Yarın" / "Dün" / "3 gün gecikti" / "2 Eyl 2026" */
export function formatRelativeDay(value: DateInput): string {
  const diff = daysFromToday(value)
  if (diff === 0) return "Bugün"
  if (diff === 1) return "Yarın"
  if (diff === -1) return "Dün"
  if (diff < 0) return `${Math.abs(diff)} gün gecikti`
  if (diff < 7) return `${diff} gün sonra`
  return formatDate(value)
}

export type DueTone = "overdue" | "today" | "soon" | "later" | "none"

/** Due-date label + tone for tasks / next actions. */
export function describeDue(value: DateInput | null | undefined): {
  label: string
  tone: DueTone
} {
  if (!value) return { label: "Tarihsiz", tone: "none" }
  const diff = daysFromToday(value)
  if (diff < 0)
    return { label: `${Math.abs(diff)} gün gecikti`, tone: "overdue" }
  if (diff === 0) return { label: "Bugün", tone: "today" }
  if (diff === 1) return { label: "Yarın", tone: "soon" }
  if (diff < 7) return { label: `${diff} gün sonra`, tone: "soon" }
  return { label: formatDate(value), tone: "later" }
}

/** Heading for a timeline/feed day group. */
export function timelineGroupLabel(value: DateInput): string {
  const diff = daysFromToday(value)
  if (diff === 0) return "Bugün"
  if (diff === 1) return "Yarın"
  if (diff === -1) return "Dün"
  if (diff > -7 && diff < 0) return formatWeekday(value)
  return formatDateLong(value)
}

/** "az önce" / "5 dk önce" / "2 saat önce" / "dün" / "3 gün önce" / date */
export function formatTimeAgo(value: DateInput): string {
  const seconds = Math.round((Date.now() - toDate(value).getTime()) / 1000)
  if (seconds < 45) return "az önce"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.round(hours / 24)
  if (days === 1) return "dün"
  if (days < 7) return `${days} gün önce`
  return formatDate(value)
}

/** "₺50.000" — whole major units, no fraction. */
export function formatMoney(
  amount: number | null | undefined,
  currency = "TRY"
): string {
  if (amount == null) return "—"
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat("tr-TR").format(amount)} ${currency}`
  }
}

// Turkey has observed a fixed UTC+3 offset (no DST) since 2016, so a constant
// offset is safe here and avoids pulling in a tz database.
const ISTANBUL_OFFSET_MIN = 180

/** Parse a `datetime-local` value ("2026-09-02T14:30") as Istanbul wall time. */
export function parseIstanbulLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  const t = Date.UTC(y, mo - 1, d, h, mi) - ISTANBUL_OFFSET_MIN * 60_000
  return Number.isNaN(t) ? null : new Date(t)
}

/** Parse a `date` value ("2026-09-02") as Istanbul midnight. */
export function parseIstanbulDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [y, mo, d] = m.slice(1).map(Number)
  const t = Date.UTC(y, mo - 1, d) - ISTANBUL_OFFSET_MIN * 60_000
  return Number.isNaN(t) ? null : new Date(t)
}

/** A Date → `datetime-local` input value in Istanbul wall time. */
export function toLocalInputValue(value: DateInput): string {
  const shifted = new Date(
    toDate(value).getTime() + ISTANBUL_OFFSET_MIN * 60_000
  )
  return shifted.toISOString().slice(0, 16)
}

/** A Date → `date` input value ("2026-09-02") in Istanbul. */
export function toDateInputValue(value: DateInput): string {
  return istanbulDayKey(value)
}

/** Compact form for dense cards: "₺50 B", "₺1,2 Mn". Falls back to full. */
export function formatMoneyCompact(
  amount: number | null | undefined,
  currency = "TRY"
): string {
  if (amount == null) return "—"
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return formatMoney(amount, currency)
  }
}
