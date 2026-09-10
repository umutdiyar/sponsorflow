import { test, expect, type Page } from "@playwright/test"

/**
 * Route protection — runs with no credentials. Every dashboard route must bounce
 * an unauthenticated visitor to /login.
 */
const PROTECTED = [
  "/dashboard",
  "/companies",
  "/contacts",
  "/pipeline",
  "/opportunities",
  "/packages",
  "/tasks",
  "/activities",
  "/team",
  "/import",
  "/export",
  "/settings",
]

test.describe("route protection (no auth)", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test("/login renders the sign-in form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /giriş yap/i })
    ).toBeVisible()
  })

  test("/forgot-password renders", async ({ page }) => {
    await page.goto("/forgot-password")
    await expect(
      page.getByRole("heading", { name: /şifreni mi unuttun/i })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /girişe dön/i })
    ).toBeVisible()
  })
})

/**
 * Authenticated smoke — only runs when a test account is supplied.
 *
 *   E2E_EMAIL=you@example.com E2E_PASSWORD=... pnpm e2e
 *
 * Use a low-privilege throwaway account on a disposable org.
 */
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD

async function login(page: Page) {
  await page.goto("/login")
  await page.locator("#email").fill(EMAIL!)
  await page.locator("#password").fill(PASSWORD!)
  await page.getByRole("button", { name: /giriş yap/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
}

test.describe("authenticated smoke", () => {
  test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL / E2E_PASSWORD to run")

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("dashboard shows the four KPIs and today panel", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Genel Bakış" })
    ).toBeVisible()
    for (const label of [
      "Firma",
      "Atanmamış",
      "Takip Bekleyen",
      "Aktif Sponsor Süreci",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByRole("heading", { name: "Bugün" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Ekip Durumu" })
    ).toBeVisible()
  })

  test("sidebar no longer lists Fırsatlar", async ({ page }) => {
    const nav = page.getByRole("navigation")
    await expect(nav.getByRole("link", { name: "Planlama" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Fırsatlar" })).toHaveCount(0)
  })

  const PAGES: [string, string][] = [
    ["/companies", "Firmalar"],
    ["/contacts", "Kişiler"],
    ["/pipeline", "Pipeline"],
    ["/tasks", "Planlama"],
    ["/packages", "Sponsorluk Paketleri"],
    ["/team", "Ekip"],
    ["/import", "İçe Aktar"],
    ["/export", "Dışa Aktar"],
    ["/settings", "Ayarlar"],
  ]
  for (const [path, heading] of PAGES) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path)
      await expect(
        page.getByRole("heading", { name: heading, exact: true })
      ).toBeVisible()
    })
  }

  test("pipeline shows the 6 consolidated stages", async ({ page }) => {
    await page.goto("/pipeline")
    for (const s of [
      "Araştırılıyor",
      "İletişime Geçildi",
      "Görüşülüyor",
      "Yanıt Alındı",
      "Olumlu",
      "Olumsuz",
    ]) {
      await expect(page.getByText(s, { exact: true }).first()).toBeVisible()
    }
    for (const gone of ["Müzakere", "Teklif", "Kazanıldı", "Kaybedildi"]) {
      await expect(page.getByText(gone, { exact: true })).toHaveCount(0)
    }
  })

  test("planner has week navigation and unscheduled toggle", async ({ page }) => {
    await page.goto("/tasks")
    await expect(
      page.getByRole("button", { name: "Bugün", exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /planlanmamış/i })
    ).toBeVisible()
  })

  test("settings exposes password change", async ({ page }) => {
    await page.goto("/settings")
    await expect(
      page.getByRole("heading", { name: "Şifre Değiştir" })
    ).toBeVisible()
  })
})

/**
 * Restricted-role checks. Provide a MEMBER-role account (throwaway org).
 *
 *   E2E_MEMBER_EMAIL=... E2E_MEMBER_PASSWORD=... pnpm e2e
 */
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD

test.describe("member role restrictions", () => {
  test.skip(
    !MEMBER_EMAIL || !MEMBER_PASSWORD,
    "set E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD to run"
  )

  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.locator("#email").fill(MEMBER_EMAIL!)
    await page.locator("#password").fill(MEMBER_PASSWORD!)
    await page.getByRole("button", { name: /giriş yap/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  })

  test("MEMBER sees the dashboard", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Genel Bakış" })
    ).toBeVisible()
  })

  test("MEMBER cannot add a team member", async ({ page }) => {
    await page.goto("/team")
    await expect(
      page.getByRole("button", { name: "Ekip Üyesi Ekle" })
    ).toHaveCount(0)
  })

  test("MEMBER has no access to import", async ({ page }) => {
    await page.goto("/import")
    // requirePermission("data:import") → ForbiddenError → friendly error screen
    await expect(
      page.getByRole("heading", { name: "İçe Aktar", exact: true })
    ).toHaveCount(0)
  })
})
