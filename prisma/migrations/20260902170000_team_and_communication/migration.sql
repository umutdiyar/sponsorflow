-- CreateEnum
CREATE TYPE "ActivityChannel" AS ENUM ('EMAIL', 'LINKEDIN', 'WHATSAPP', 'PHONE', 'MEETING', 'OTHER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('INITIAL_CONTACT', 'FOLLOW_UP', 'RESPONSE', 'PROPOSAL', 'MEETING_NOTE', 'NOTE', 'STAGE_CHANGE');

-- CreateEnum
CREATE TYPE "ActivityDirection" AS ENUM ('OUTBOUND', 'INBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "OrganizationMembership" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "channel" "ActivityChannel" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "direction" "ActivityDirection" NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "kind" "ActivityKind" NOT NULL DEFAULT 'NOTE';

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "OrganizationRole" NOT NULL,
    "invitedByMembershipId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_status_idx" ON "OrganizationInvitation"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "OrganizationInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Activity_contactId_occurredAt_idx" ON "Activity"("contactId", "occurredAt");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedByMembershipId_fkey" FOREIGN KEY ("invitedByMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Backfill the new communication axes from the legacy `type` column so existing
-- activity history keeps meaningful channel / kind / direction values.
UPDATE "Activity" SET "channel" = 'EMAIL',    "kind" = 'NOTE',         "direction" = 'OUTBOUND' WHERE "type" = 'EMAIL';
UPDATE "Activity" SET "channel" = 'PHONE',    "kind" = 'NOTE',         "direction" = 'OUTBOUND' WHERE "type" = 'PHONE';
UPDATE "Activity" SET "channel" = 'MEETING',  "kind" = 'MEETING_NOTE', "direction" = 'OUTBOUND' WHERE "type" = 'MEETING';
UPDATE "Activity" SET "channel" = 'LINKEDIN', "kind" = 'NOTE',         "direction" = 'OUTBOUND' WHERE "type" = 'LINKEDIN';
UPDATE "Activity" SET "channel" = 'WHATSAPP', "kind" = 'NOTE',         "direction" = 'OUTBOUND' WHERE "type" = 'WHATSAPP';
UPDATE "Activity" SET "channel" = 'INTERNAL', "kind" = 'NOTE',         "direction" = 'INTERNAL' WHERE "type" = 'NOTE';
UPDATE "Activity" SET "channel" = 'EMAIL',    "kind" = 'PROPOSAL',     "direction" = 'OUTBOUND' WHERE "type" = 'PROPOSAL';
UPDATE "Activity" SET "channel" = 'EMAIL',    "kind" = 'FOLLOW_UP',    "direction" = 'OUTBOUND' WHERE "type" = 'FOLLOW_UP';
UPDATE "Activity" SET "channel" = 'INTERNAL', "kind" = 'STAGE_CHANGE',  "direction" = 'INTERNAL' WHERE "type" = 'STAGE_CHANGE';
