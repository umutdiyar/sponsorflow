import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke E2E for SponsorFlow.
 *
 * Runs the production server (`pnpm start`, so `pnpm build` must have run) and
 * checks that the app boots, protects its routes, and — when a test account is
 * provided via `E2E_EMAIL` / `E2E_PASSWORD` — that the main authenticated
 * screens render. See `e2e/README.md`.
 */

const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Only manage a server when pointing at localhost. Point E2E_BASE_URL at an
  // already-running deployment to skip this.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
})
