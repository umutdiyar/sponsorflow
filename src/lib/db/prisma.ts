import "server-only"

import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * Prisma client singleton, backed by the `pg` driver adapter.
 *
 * Runtime uses `DIRECT_URL` (Supabase Session Pooler, port 5432) when available:
 * on a persistent Node server (`next start`) session-mode connections stay warm
 * and support prepared statements, which is faster than the Transaction Pooler
 * (`DATABASE_URL`, pgbouncer/6543) that recycles connections per statement.
 * Falls back to `DATABASE_URL` for serverless/edge deploys. Migrations always
 * use `DIRECT_URL` via `prisma.config.ts`.
 *
 * The pool is tuned to keep connections warm between requests — the database is
 * in `ap-south-1`, so avoiding per-request connection setup matters.
 *
 * `server-only` guarantees this never lands in a client bundle.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    "Eksik ortam değişkeni: DIRECT_URL / DATABASE_URL. Supabase bağlantı dizelerini `.env` dosyasına ekle."
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaPool?: Pool
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaPool = pool
}
