/**
 * Development-only dense-data fixture. NOT part of `prisma/seed.ts` and never
 * run against production.
 *
 *   pnpm fixture
 *
 * Populates the seeded organization with ~50 companies, ~120 contacts, plus a
 * spread of activities, opportunities and tasks so the tables can be reviewed
 * with realistic density. Requires at least one OrganizationMembership (i.e.
 * someone has signed in once). Idempotent-ish: skips if the org already has 40+
 * companies.
 */
import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../src/generated/prisma/client"
import type {
  ActivityChannel,
  ActivityDirection,
  ActivityKind,
  ActivityType,
} from "../src/generated/prisma/enums"

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error("DIRECT_URL / DATABASE_URL gerekli")

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const NAMES = [
  "Nova", "Vertex", "Lumen", "Atlas", "Orbit", "Fathom", "Quanta", "Meridian",
  "Cobalt", "Halcyon", "Ember", "Pixel", "Cascade", "Beacon", "Forge", "Aster",
  "Zenith", "Delta", "Ridge", "Harbor", "Cortex", "Sable", "Vantage", "Pulse",
  "Kite", "Larch", "Onyx", "Prism", "Rune", "Torch",
]
const SUFFIX = ["Teknoloji", "Yazılım", "Bilişim", "Digital", "Labs", "Ajans", "Grup", "Sistemleri"]
const SECTORS = [
  "Teknoloji & Yazılım", "Bulut & Altyapı", "Yapay Zeka", "Siber Güvenlik",
  "Finans & Bankacılık", "E-ticaret", "Telekomünikasyon", "Danışmanlık",
  "Eğitim", "Oyun", "Sağlık Teknolojileri", "Medya & Reklam",
]
const SOURCES = ["LinkedIn", "Referans", "Etkinlik", "Web sitesi", "Soğuk iletişim", "Ekip önerisi"]
const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Kocaeli"]
const FIRST = ["Deniz", "Ada", "Ege", "Mert", "Selin", "Kaan", "Ceren", "Baran", "Elif", "Arda", "Nil", "Emre"]
const LAST = ["Yılmaz", "Demir", "Kaya", "Çelik", "Şahin", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç"]
const CHANNELS: ActivityChannel[] = ["EMAIL", "LINKEDIN", "PHONE", "MEETING", "WHATSAPP"]
const KINDS: ActivityKind[] = ["INITIAL_CONTACT", "FOLLOW_UP", "RESPONSE", "MEETING_NOTE", "NOTE"]

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}
function legacyType(channel: ActivityChannel, kind: ActivityKind): ActivityType {
  if (kind === "RESPONSE" || kind === "FOLLOW_UP") return "FOLLOW_UP"
  if (kind === "MEETING_NOTE") return "MEETING"
  if (channel === "EMAIL") return "EMAIL"
  if (channel === "PHONE") return "PHONE"
  if (channel === "MEETING") return "MEETING"
  if (channel === "LINKEDIN") return "LINKEDIN"
  if (channel === "WHATSAPP") return "WHATSAPP"
  return "NOTE"
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000)
}
function daysAhead(n: number): Date {
  return new Date(Date.now() + n * 86_400_000)
}

async function main() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })
  if (!org) throw new Error("Organizasyon yok — önce `pnpm db:seed` çalıştır.")

  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: org.id, deactivatedAt: null },
    select: { id: true },
  })
  if (members.length === 0) {
    console.log(
      "⚠ Üyelik yok. Fixture için önce uygulamaya bir kez giriş yap (OWNER oluşturulur)."
    )
    return
  }

  const existing = await prisma.company.count({ where: { organizationId: org.id } })
  if (existing >= 40) {
    console.log(`✓ Zaten ${existing} firma var — fixture atlandı.`)
    return
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, type: true },
  })
  const creator = members[0].id
  const owners = [null, ...members.map((m) => m.id)] // ~1/(n+1) unassigned

  let companies = 0
  let contacts = 0
  let activities = 0
  let opportunities = 0
  let tasks = 0

  for (let i = 0; i < 50; i++) {
    const name = `${pick(NAMES, i)} ${pick(SUFFIX, i >> 1)}`
    const ownerId = owners[i % owners.length]
    const company = await prisma.company.create({
      data: {
        organizationId: org.id,
        createdByMembershipId: creator,
        ownerMembershipId: ownerId,
        name,
        domain: `${pick(NAMES, i).toLowerCase()}${i}.example.com`,
        website: `https://${pick(NAMES, i).toLowerCase()}${i}.example.com`,
        industry: pick(SECTORS, i),
        source: pick(SOURCES, i),
        city: pick(CITIES, i),
        country: "Türkiye",
      },
      select: { id: true },
    })
    companies++

    const nContacts = 1 + (i % 3)
    const contactIds: string[] = []
    for (let c = 0; c < nContacts; c++) {
      const created = await prisma.contact.create({
        data: {
          organizationId: org.id,
          companyId: company.id,
          createdByMembershipId: creator,
          firstName: pick(FIRST, i + c),
          lastName: pick(LAST, i * 2 + c),
          jobTitle: c === 0 ? "Pazarlama Direktörü" : "İş Geliştirme",
          email: `kisi${i}-${c}@${pick(NAMES, i).toLowerCase()}.example.com`,
          isPrimary: c === 0,
        },
        select: { id: true },
      })
      contactIds.push(created.id)
      contacts++
    }

    // Communication spread: ~70% of companies have some activity.
    if (i % 10 !== 0) {
      const steps = 1 + (i % 4)
      for (let s = 0; s < steps; s++) {
        const channel = pick(CHANNELS, i + s)
        const inbound = s > 0 && i % 3 === 0 && s === steps - 1
        const kind: ActivityKind = inbound
          ? "RESPONSE"
          : s === 0
            ? "INITIAL_CONTACT"
            : pick(KINDS, s)
        const direction: ActivityDirection = inbound ? "INBOUND" : "OUTBOUND"
        await prisma.activity.create({
          data: {
            organizationId: org.id,
            companyId: company.id,
            contactId: contactIds[0],
            createdByMembershipId: creator,
            type: legacyType(channel, kind),
            channel,
            kind,
            direction,
            description: `${name} ile ${channel} üzerinden iletişim`,
            occurredAt: daysAgo(30 - i / 2 - s * 3),
          },
        })
        activities++
      }
    }

    // ~40% have an opportunity.
    if (i % 5 < 2 && stages.length) {
      const stage = pick(stages, i)
      const overdue = i % 4 === 0
      await prisma.opportunity.create({
        data: {
          organizationId: org.id,
          companyId: company.id,
          createdByMembershipId: creator,
          ownerMembershipId: ownerId ?? creator,
          stageId: stage.id,
          title: `${name} sponsorluğu`,
          estimatedValue: 25_000 + (i % 8) * 15_000,
          probability: 20 + (i % 5) * 15,
          nextAction: "Teklif dokümanını gönder",
          nextActionAt: overdue ? daysAgo(2 + (i % 5)) : daysAhead(3 + (i % 7)),
        },
      })
      opportunities++
    }

    // ~40% have a task.
    if (i % 5 < 2) {
      await prisma.task.create({
        data: {
          organizationId: org.id,
          createdByMembershipId: creator,
          assignedToMembershipId: ownerId ?? creator,
          companyId: company.id,
          title: `${name} — takip et`,
          priority: pick(["LOW", "MEDIUM", "HIGH", "URGENT"] as const, i),
          status: "TODO",
          dueAt:
            i % 3 === 0
              ? daysAgo(1 + (i % 4))
              : daysAhead((i % 10) - 3),
        },
      })
      tasks++
    }
  }

  console.log(
    `✓ fixture: ${companies} firma · ${contacts} kişi · ${activities} aktivite · ${opportunities} süreç · ${tasks} görev`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
