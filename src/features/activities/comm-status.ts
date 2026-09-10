/**
 * "İletişim Durumu" — a single derived communication state shared by the
 * contacts and companies tables. Derived from Activity + Opportunity data;
 * nothing is stored. Precedence: followup > replied > contacted > none.
 */

export const COMM_STATUSES = [
  "none",
  "contacted",
  "replied",
  "followup",
] as const
export type CommStatus = (typeof COMM_STATUSES)[number]

export const COMM_STATUS_LABELS: Record<CommStatus, string> = {
  none: "Henüz İletişim Yok",
  contacted: "İletişime Geçildi",
  replied: "Yanıt Geldi",
  followup: "Takip Gerekiyor",
}

/** Days after an unanswered outbound message that a follow-up is "due". */
export const COMM_STALE_DAYS = 7

export function deriveCommStatus(input: {
  lastOutboundAt?: Date | null
  lastInboundAt?: Date | null
  /** company has an opportunity whose next action is due today or overdue */
  hasOverdueFollowUp: boolean
  /** cutoff = today − COMM_STALE_DAYS (a UTC-midnight Date) */
  staleBefore: Date
}): CommStatus {
  const { lastOutboundAt: out, lastInboundAt: inb, hasOverdueFollowUp } = input
  if (!out && !inb) return "none"
  const staleOutbound =
    !!out &&
    (!inb || inb < out) &&
    out.getTime() < input.staleBefore.getTime()
  if (hasOverdueFollowUp || staleOutbound) return "followup"
  if (inb) return "replied"
  return "contacted"
}
