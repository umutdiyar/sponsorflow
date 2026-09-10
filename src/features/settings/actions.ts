"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/auth/membership"
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/features/settings/schema"

const GENERIC = "Şifre güncellenemedi. Lütfen tekrar dene."

export type SettingsActionResult = { ok: true } | { ok: false; error: string }

/**
 * The signed-in user changes their own password. Runs against the request's
 * Supabase session (not the admin client), so it only ever affects the caller.
 */
export async function changeOwnPassword(
  input: ChangePasswordInput
): Promise<SettingsActionResult> {
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? GENERIC }
  }

  try {
    // Ensures there is an authenticated, provisioned member making the request.
    await getCurrentMembership()

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    })
    if (error) {
      console.error("changeOwnPassword", { code: error.code, message: error.message })
      return {
        ok: false,
        error:
          error.message.toLowerCase().includes("different from the old")
            ? "Yeni şifre eskisinden farklı olmalı."
            : GENERIC,
      }
    }
    return { ok: true }
  } catch (error) {
    console.error("changeOwnPassword", error)
    return { ok: false, error: GENERIC }
  }
}
