/**
 * Development seed — organization + pipeline stages only.
 *
 * Auth users are NOT seeded (Supabase owns authentication). The app provisions
 * each user's Profile + OrganizationMembership on their first authenticated
 * request (see `src/lib/auth/membership.ts`), so no auth UUIDs are needed here.
 */
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../src/generated/prisma/client"
import type { PipelineStageType } from "../src/generated/prisma/enums"

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("Eksik ortam değişkeni: DIRECT_URL veya DATABASE_URL")
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const ORG = {
  name: "AWS Student Builder Group at Okan University",
  slug: "aws-sbg-okan",
  logoUrl: "/brand/aws-sbg-okan-logo.svg",
}

const STAGES: { name: string; key: string; type: PipelineStageType }[] = [
  { name: "Araştırma", key: "research", type: "OPEN" },
  { name: "İletişim Bulundu", key: "contact-found", type: "OPEN" },
  { name: "İletişime Geçildi", key: "contacted", type: "OPEN" },
  { name: "Yanıt Alındı", key: "replied", type: "OPEN" },
  { name: "Görüşme", key: "meeting", type: "OPEN" },
  { name: "Teklif", key: "proposal", type: "OPEN" },
  { name: "Müzakere", key: "negotiation", type: "OPEN" },
  { name: "Kazanıldı", key: "won", type: "WON" },
  { name: "Kaybedildi", key: "lost", type: "LOST" },
]

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: ORG.slug },
    create: ORG,
    update: { name: ORG.name, logoUrl: ORG.logoUrl },
  })
  console.log(`✓ organization: ${org.name} (${org.id})`)

  for (const [index, stage] of STAGES.entries()) {
    await prisma.pipelineStage.upsert({
      where: {
        organizationId_key: { organizationId: org.id, key: stage.key },
      },
      create: {
        organizationId: org.id,
        name: stage.name,
        key: stage.key,
        type: stage.type,
        position: index,
      },
      update: { name: stage.name, type: stage.type, position: index },
    })
  }
  console.log(`✓ ${STAGES.length} pipeline stages`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
