# E2E smoke tests

Playwright smoke coverage for SponsorFlow. Not a full regression suite — it
checks that the app boots, protects its routes, and (optionally) that the main
authenticated screens render.

## One-time setup

```bash
pnpm install
pnpm exec playwright install chromium
```

## Run

The runner starts the **production** server, so build first:

```bash
pnpm build
pnpm e2e            # route-protection tests only
```

### With a test account (authenticated smoke)

Use a throwaway low-privilege account on a disposable organization — the tests
only read.

```bash
pnpm build
E2E_EMAIL="test@example.com" E2E_PASSWORD="…" pnpm e2e
```

### Against an already-running server / deployment

```bash
E2E_BASE_URL="https://staging.example.com" \
E2E_EMAIL="…" E2E_PASSWORD="…" pnpm exec playwright test
```

## What is covered

- **No auth:** every `/…` dashboard route redirects to `/login`; `/login` and
  `/forgot-password` render.
- **With auth:** dashboard KPIs + "Bugün" / "Ekip Durumu" panels; sidebar no
  longer lists "Fırsatlar" but does list "Planlama"; companies, pipeline,
  planning, import and export pages render.

## Manual regression still required

Playwright does not cover: role matrix (OWNER/LEAD/MEMBER/VIEWER differences),
drag-and-drop on pipeline / planner, invite email delivery, CSV/XLSX import and
export round-trips, and cross-org isolation. Run those by hand.
