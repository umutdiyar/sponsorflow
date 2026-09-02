import "server-only"

import type { Prisma } from "@/generated/prisma/client"

type Client = Prisma.TransactionClient

/**
 * Append a system `STAGE_CHANGE` activity when an opportunity moves between
 * pipeline stages. Called from inside the opportunity update transaction — not
 * an audit-log engine, just a human-readable trail on the timeline.
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
      title: "Pipeline aşaması değiştirildi",
      description: `${args.fromStageName} → ${args.toStageName}`,
      occurredAt: new Date(),
    },
    select: { id: true },
  })
}
