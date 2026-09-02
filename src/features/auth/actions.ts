"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginInput } from "@/features/auth/schema"

export type SignInResult = { error: string }

const GENERIC_ERROR = "Beklenmeyen bir hata oluştu. Lütfen tekrar dene."
const INVALID_CREDENTIALS =
  "E-posta veya şifre hatalı. Bilgilerini kontrol edip tekrar dene."

function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard"
  }
  return next
}

/**
 * Authenticates with email + password. On success it redirects and never
 * returns; on failure it returns a user-facing (Turkish) error message.
 */
export async function signIn(
  input: LoginInput & { next?: string }
): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    const isInvalid =
      error.status === 400 ||
      error.code === "invalid_credentials" ||
      error.message.toLowerCase().includes("invalid login credentials")
    return { error: isInvalid ? INVALID_CREDENTIALS : GENERIC_ERROR }
  }

  revalidatePath("/", "layout")
  redirect(safeNextPath(input.next))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
