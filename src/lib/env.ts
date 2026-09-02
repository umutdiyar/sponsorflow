import { z } from "zod"

class MissingEnvError extends Error {
  constructor(missing: string[], hint?: string) {
    super(
      [
        `Eksik ortam değişkeni: ${missing.join(", ")}.`,
        hint ?? "`.env` dosyanı `.env.example` referansına göre doldur.",
      ].join(" ")
    )
    this.name = "MissingEnvError"
  }
}

function readValidated<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  source: Record<string, string | undefined>,
  hint?: string
): z.infer<z.ZodObject<T>> {
  const parsed = schema.safeParse(source)
  if (parsed.success) return parsed.data

  const missing = parsed.error.issues.map((issue) => issue.path.join("."))
  throw new MissingEnvError([...new Set(missing)], hint)
}

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    message: "geçerli bir URL olmalı",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

let supabaseCache: z.infer<typeof supabaseSchema> | null = null

export function getSupabaseConfig() {
  if (!supabaseCache) {
    supabaseCache = readValidated(
      supabaseSchema,
      {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      "Supabase Dashboard -> Project Settings -> API bölümünden URL ve publishable key değerlerini `.env` dosyasına ekle."
    )
  }
  return {
    url: supabaseCache.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: supabaseCache.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

/** Public base URL of the app. Falls back to localhost in development. */
export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
