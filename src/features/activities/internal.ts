import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import type {
  ActivityChannel,
  ActivityKind,
  ActivityType,
} from "@/generated/prisma/enums"

type Client = Prisma.TransactionClient

/**
 * The legacy single-axis `Activity.type` value for a (channel, kind) pair. Kept
 * consistent so historical reports / the old column stay meaningful; new UI
 * reads channel/kind/direction directly.
 */
export function deriveLegacyType(
  channel: ActivityChannel,
  kind: ActivityKind
): ActivityType {
  if (kind === "STAGE_CHANGE") return "STAGE_CHANGE"
  if (kind === "PROPOSAL") return "PROPOSAL"
  if (kind === "FOLLOW_UP") return "FOLLOW_UP"
  switch (channel) {
    case "EMAIL":
      return "EMAIL"
    case "PHONE":
      return "PHONE"
    case "MEETING":
      return "MEETING"
    case "LINKEDIN":
      return "LINKEDIN"
    case "WHATSAPP":
      return "WHATSAPP"
    default:
      return "NOTE"
  }
}

/**
 * Append a system STAGE_CHANGE activity when an opportunity moves between
 * pipeline stages. Called inside the opportunity update transaction.
 */
export function recordStageChange(
  tx: Client,
  args: {
    organizationId: string
    companyId: string
    opportunityId: string
    membershipId: string
    fromStageName: string
    toStageName: string
  }
) {
  return tx.activity.create({
    data: {
      organizationId: args.organizationId,
      companyId: args.companyId,
      opportunityId: args.opportunityId,
      createdByMembershipId: args.membershipId,
      type: "STAGE_CHANGE",
      channel: "INTERNAL",
      kind: "STAGE_CHANGE",
      direction: "INTERNAL",
      title: "Pipeline aşaması değiştirildi",
      description: `${args.fromStageName} → ${args.toStageName}`,
      occurredAt: new Date(),
    },
    select: { id: true },
  })
}
