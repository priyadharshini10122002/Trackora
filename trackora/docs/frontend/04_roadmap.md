# Trackora Frontend — Part 4: Delivery, CI/CD & Roadmap

> **Scope.** This document covers sections 31–34 of the Trackora frontend plan: CI/CD pipeline, phased implementation roadmap, definition of done, and appendices (API mapping, scaffolding commands, troubleshooting).
>
> **Audience.** Engineering leads and senior React engineers planning and executing Trackora frontend delivery. Builds on [Part 1](./01_architecture.md), [Part 2](./02_features.md), and [Part 3](./03_quality.md).

---

## 31. CI/CD Pipeline

The pipeline is the contract between "I wrote code" and "users can use it." A good pipeline is fast (< 10 min PR feedback), deterministic (no flakes), and fails early (cheapest checks first).

### 31.1 Principles

1. **Fail fast.** Order stages by cost: lint (seconds) → typecheck (seconds) → unit tests (under a minute) → build (1–2 min) → E2E (5–10 min).
2. **Parallelize within a stage.** Lint, typecheck, and unit tests run concurrently — they don't depend on each other.
3. **Cache aggressively.** pnpm store, Playwright browsers, Vite's transform cache, Turbo remote cache.
4. **Every PR gets a preview deployment.** Reviewers see the actual UI, not just a diff.
5. **Main branch is always deployable.** If main goes red, everything else stops until it's green.

### 31.2 GitHub Actions workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      pnpm-store: ${{ steps.pnpm-cache.outputs.dir }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

  lint:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  unit:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:ci
      - uses: codecov/codecov-action@v4

  build:
    needs: [lint, typecheck, unit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          VITE_APP_VERSION: ${{ github.sha }}
          VITE_API_URL: ${{ vars.STAGING_API_URL }}
          VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
      - name: Bundle size gate
        run: pnpm size-limit
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist, retention-days: 7 }

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - run: pnpm exec playwright install --with-deps chromium firefox
      - run: pnpm test:e2e
        env:
          E2E_BASE_URL: ${{ vars.STAGING_URL }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report }

  preview-deploy:
    if: github.event_name == 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist, path: dist }
      - name: Deploy to Vercel preview
        run: npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  lighthouse:
    if: github.event_name == 'pull_request'
    needs: preview-deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: ${{ needs.preview-deploy.outputs.url }}
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

### 31.3 Bundle size gate

Regressions in bundle size degrade LCP and TTI silently. A hard budget forces conversations to happen at PR time:

```jsonc
// .size-limit.json
[
  { "name": "app-initial",  "path": "dist/assets/index-*.js", "limit": "220 KB" },
  { "name": "app-vendor",   "path": "dist/assets/vendor-*.js", "limit": "180 KB" },
  { "name": "css",          "path": "dist/assets/*.css", "limit": "40 KB" }
]
```

Sizes are gzipped. Limits are set to current + 10% headroom; raising them requires an explicit PR with justification.

### 31.4 Lighthouse CI budgets

```jsonc
// lighthouserc.json
{
  "ci": {
    "collect": { "numberOfRuns": 3 },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

### 31.5 Deployment target

**Recommendation: Vercel** for preview + production.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Vercel** | Zero-config previews, edge CDN, atomic deploys, analytics | Vendor lock-in on some features | ✅ Start here |
| Netlify | Very similar to Vercel | Slightly slower build minutes | Acceptable |
| S3 + CloudFront | Max control, cheapest at scale | Manual preview env setup, more glue | Consider once scale demands |
| Nginx on own infra | Full control | Ops overhead, no preview envs | Only if compliance demands |

Production deploys on merge to `main` after all checks pass. Rollbacks are a Vercel one-click.

### 31.6 Release process

1. PR merges to `main` → GitHub Actions re-runs full suite → Vercel production deploy.
2. `release-please` opens a "Release PR" tracking conventional commits since last release.
3. Merging the Release PR creates a Git tag (`v1.4.0`), a GitHub Release with changelog, and uploads source maps to Sentry tagged with the release.
4. Sentry's release-tracking now shows "regressions" vs the previous release and "new issues" specific to this release.

### 31.7 Rollback

- **Instant rollback.** Vercel → previous deployment → promote. Takes ~10 seconds.
- **Feature flag rollback.** If a problematic change is behind a LaunchDarkly flag (see § 32.2), turn off without redeploying.
- **Post-mortem required** for any production rollback — template in `docs/postmortems/`.

### 31.8 Secrets management

- GitHub Actions secrets for build-time values (`VITE_SENTRY_DSN`, Vercel token).
- No secrets in `VITE_*` vars actually shipped to the browser — those are public by definition. Treat them accordingly (DSNs, public Stripe keys, etc.).
- Backend API tokens never live on the frontend; all authorization flows through user JWTs.

---

## 32. Phased Implementation Roadmap

Shipping a full SPA in one big-bang release is high-risk and low-learning. We deliver in six phases, each with a demo at the end, clear exit criteria, and a reversible go/no-go gate before starting the next.

### 32.1 Overview

| Phase | Duration | Goal | Users | Demo |
|---|---|---|---|---|
| **0 — Foundation** | 1 week | Repo, tooling, CI/CD, design system stub | Internal | "Hello, Trackora" renders on Vercel preview |
| **1 — Read-only MVP** | 3 weeks | Login, dashboard, task list, task detail (read) | Internal | Stakeholder logs in and browses real staging data |
| **2 — Task lifecycle** | 3 weeks | Create, edit, workflow actions, comments, attachments | Closed beta | A contributor creates and completes a real task |
| **3 — Collaboration** | 2 weeks | Kanban, notifications (polling), admin | Closed beta | Team runs a full sprint on Trackora |
| **4 — Polish** | 2 weeks | Settings, SLA visuals, empty/error-state pass, perf | Open beta | Lighthouse > 90 on every page |
| **5 — Realtime & scale** | 2 weeks | SSE upgrade, i18n, perf hardening, a11y audit | GA | WCAG AA audit passed, p75 LCP < 2.5s |

**Total: 13 weeks to GA.** Assumes 2–3 senior React engineers + 1 designer part-time.

### 32.2 Feature flags

LaunchDarkly (or open-source `Unleash` for self-host) from day one. Every new feature ships behind a flag, defaulted off in production, on in staging. This decouples deploy from release and makes the roadmap reversible.

**Flag naming.** `<phase>.<feature>` e.g. `phase3.kanban-board`, `phase5.realtime-sse`.

Kill-switch flags for risky changes: `emergency.disable-realtime`, `emergency.force-polling`.

---

### 32.3 Phase 0 — Foundation (1 week)

**Goal.** Every piece of scaffolding in place so Phase 1 work is pure feature code.

**Tickets:**
- `TR-F0-001` Scaffold Vite + React 18 + TS project per [Part 1 § 3](./01_architecture.md#3-technology-stack).
- `TR-F0-002` Install and configure ESLint, Prettier, Husky, lint-staged, commitlint (Part 3 § 30).
- `TR-F0-003` Configure TanStack Query, React Router v6 data APIs, Zustand, RHF+Zod.
- `TR-F0-004` Tailwind + shadcn/ui setup, design tokens from Part 1 § 9.3.
- `TR-F0-005` OpenAPI type generation script; point at staging schema.
- `TR-F0-006` Sentry + web-vitals wiring (Part 3 § 27).
- `TR-F0-007` GitHub Actions CI (Part 4 § 31.2), Vercel preview deploys, Lighthouse CI.
- `TR-F0-008` MSW + Vitest + RTL + Playwright + axe-core (Part 3 § 25).
- `TR-F0-009` Storybook with a11y addon, first story (`<Button>`).
- `TR-F0-010` README, CONTRIBUTING, onboarding checklist.

**Exit criteria:**
- ✅ `pnpm install && pnpm dev` works from a fresh clone in < 2 min.
- ✅ A PR that changes `App.tsx` opens a preview URL on Vercel within 5 min.
- ✅ Lint, typecheck, unit, e2e, lighthouse all green on `main`.
- ✅ Sentry receives a test exception.

**Demo.** "Hello, Trackora" page deployed to `trackora-web-preview.vercel.app` with real auth button stub.

---

### 32.4 Phase 1 — Read-only MVP (3 weeks)

**Goal.** A read-only tour of Trackora. Users can log in and see real data.

**Features (from Part 2):**
- § 10 Authentication (login, logout, token refresh, route guards).
- § 11 Dashboard (role-aware widgets, stats).
- § 12 Task list + filters + URL state + pagination.
- § 13 Task detail (read-only tabs: overview, history, comments-view, attachments-view).

**Non-features (intentionally deferred):**
- Task creation/editing (Phase 2).
- Workflow actions (Phase 2).
- Posting comments / uploading attachments (Phase 2).

**Backend dependencies flagged:**
- `/users/me/` endpoint needed (currently missing — see [Part 2 § 10.3](./02_features.md#103-bootstrapping-on-reload)).

**Exit criteria:**
- ✅ A Contributor can log in, see their dashboard, filter the task list to their assigned tasks, and open any task detail to read.
- ✅ Manager dashboard shows different widgets than Contributor dashboard.
- ✅ All 4 UI states (loading, empty, error, success) implemented on list + detail.
- ✅ Lighthouse Performance ≥ 90 on list and detail pages.
- ✅ Unit coverage ≥ 80% for auth + tasks features.
- ✅ Playwright E2E covers login → list → detail → logout journey.

**Demo.** Product team logs in as each of the 4 roles and walks through the read-only flows. Stakeholder sign-off required to proceed.

---

### 32.5 Phase 2 — Task lifecycle (3 weeks)

**Goal.** Users can do real work in Trackora.

**Features (from Part 2):**
- § 15 Task create & edit forms (with full Zod validation + server error mapping).
- § 13 Workflow actions (start, complete, approve, reject, reopen, cancel) with conditional menu and confirmation dialogs.
- § 16 Comments (create, edit own, @mention, internal toggle, optimistic append).
- § 17 Attachments (upload with progress, preview, delete).

**Exit criteria:**
- ✅ Full happy-path lifecycle: create → assign → start → complete → approve, all via UI.
- ✅ Reject flow with mandatory reason field works end-to-end.
- ✅ Optimistic comment append with rollback on failure.
- ✅ Attachment upload shows progress, handles cancellation, validates client-side.
- ✅ Form dirty-state prevents accidental navigation.
- ✅ Server validation errors map to specific fields (tested via MSW).

**Demo.** Beta user creates a task, a reviewer approves it, a second reviewer rejects a different task with a reason. All events visible in notifications (pulled on navigation — realtime in Phase 3).

---

### 32.6 Phase 3 — Collaboration (2 weeks)

**Goal.** Teams can coordinate inside Trackora.

**Features (from Part 2):**
- § 14 Kanban board with @dnd-kit, transition validation, optimistic move with rollback.
- § 18 Notifications via polling (phase-1 of the realtime strategy), with desktop notifications.
- § 19 Admin: users list, create/edit user, role management (ADMIN only).

**Exit criteria:**
- ✅ Kanban drag-drop is keyboard-accessible (Space/arrows/Esc).
- ✅ Invalid transitions are blocked before the request leaves the client.
- ✅ Notifications poll every 60s, show unread count, mark-as-read, navigate to source.
- ✅ Admin can disable a user; that user's next request returns 401 and they're logged out cleanly.

**Demo.** A team runs a 1-day simulated sprint: manager creates 10 tasks, assigns them, contributors move through Kanban, reviewers approve/reject, everyone sees notifications for their events.

---

### 32.7 Phase 4 — Polish (2 weeks)

**Goal.** Trackora feels finished.

**Features:**
- § 20 Settings (notification preferences, profile).
- SLA indicators across list + Kanban + detail.
- History timeline visualization on task detail.
- Empty-state illustrations and microcopy pass across every screen.
- Error-state copy review with a writer.
- Keyboard shortcuts (`/` for search, `c` for create, `g l` for go-to-list, etc.).
- Theme toggle (light/dark) with system-preference default.

**Exit criteria:**
- ✅ Every page has designed empty/error/loading states — no generic "loading…" text.
- ✅ Dark mode audited for contrast (Part 3 § 28.5).
- ✅ Lighthouse Performance ≥ 90 on all major pages.
- ✅ Bundle-size budget unchanged from Phase 1 (any growth justified with PR).
- ✅ Internal UX review: task to open any detail in ≤ 2 clicks from dashboard.

**Demo.** Full product walk-through to execs. Open beta opens.

---

### 32.8 Phase 5 — Realtime & scale (2 weeks)

**Goal.** Trackora is ready for production launch.

**Features:**
- § 18 SSE-based realtime (phase-2 of the realtime strategy). Swap the polling adapter behind a feature flag; same `useNotifications` hook contract.
- § 29 i18n scaffold activated (en-US + es-ES for launch; infrastructure for more).
- Full accessibility audit via NVDA + VoiceOver; fix any findings.
- Performance hardening: virtualization on long lists (already in-place from Phase 1 but tune thresholds), route-level prefetch on hover, critical CSS inlining.
- Load testing via k6 on backend endpoints the frontend hits hardest.
- Chaos testing: disable backend, kill connection mid-mutation, verify UX.

**Exit criteria:**
- ✅ Realtime latency < 2s from backend event to UI update (measured via custom metric).
- ✅ WCAG 2.1 AA audit complete with zero Level A or Level AA violations.
- ✅ p75 LCP < 2.5s from real-user monitoring over a 7-day window.
- ✅ Zero P1/P2 bugs open.
- ✅ Runbook written for the on-call rotation (§ 32.10).

**Demo.** GA launch.

---

### 32.9 Parallel workstreams

Some work is independent of the phase sequence and can happen anytime:

- **Design system evolution.** Storybook-first; designers author new primitives with engineers.
- **Documentation.** User-facing help center, keyboard shortcuts guide, API docs for eventual public API.
- **Marketing site.** Separate Next.js project, not part of this roadmap but planned in parallel.
- **Mobile native.** Out of scope for this plan; the responsive web app must work on tablet and mobile browsers, but no native apps in year one.

### 32.10 On-call runbook (written in Phase 5)

Living doc covering:
- How to identify a frontend-origin vs backend-origin incident from Sentry.
- Rollback procedure (Vercel UI and CLI).
- Feature-flag kill-switches and their effects.
- Known flakes and how to distinguish them from real regressions.
- Escalation paths to backend, design, product.

---

## 33. Definition of Done

"Done" is not "the feature works on my laptop." A ticket is done when it would survive a team member leaving — another engineer can read, maintain, and safely change the code, and operations can observe and recover it in production.

### 33.1 Feature Definition of Done

Before marking a ticket "Done," every box must be checked:

**Code**
- [ ] Implementation follows the architecture in Part 1 (correct layer, correct state kind).
- [ ] TypeScript strict, no `any`, no `@ts-ignore` without an adjacent comment citing the reason.
- [ ] Public exports go through the feature's `index.ts` barrel.
- [ ] No direct DOM manipulation except inside a documented escape hatch.
- [ ] No cross-feature imports that bypass the public API (ESLint enforced).

**Tests**
- [ ] Unit tests for new pure logic (schemas, utilities, hooks).
- [ ] Component tests for new components with non-trivial states.
- [ ] Integration test with MSW for any new API interaction.
- [ ] E2E test added or updated if the feature is on a critical journey.
- [ ] All tests pass locally and in CI; coverage thresholds hold.

**Accessibility**
- [ ] Keyboard-operable end-to-end (no mouse-only affordances).
- [ ] `jest-axe` clean on new components.
- [ ] `@axe-core/playwright` clean on the page.
- [ ] Focus management verified on modals, menus, and async transitions.
- [ ] Screen reader spot-checked if the feature introduces a new pattern.

**Observability**
- [ ] New user-facing error paths captured via `logger.error` / `logger.warn`.
- [ ] Sentry clean — no new unhandled exceptions in staging during acceptance test.
- [ ] Correlation ID flows through new request paths.
- [ ] Custom metric added for any new business-critical interaction (§ 27.5).

**UX**
- [ ] All 4 states (loading, empty, error, success) designed and implemented.
- [ ] Copy reviewed — errors actionable, empty states include a next step.
- [ ] Mobile-responsive at 375px width minimum.
- [ ] Dark-mode verified.
- [ ] Reduced-motion preference honored.

**Performance**
- [ ] Bundle-size diff < 10 KB gzipped or justified in PR description.
- [ ] Lighthouse Performance score not degraded on the affected page.
- [ ] No new N+1 query patterns in React Query (verified by inspecting DevTools).

**Process**
- [ ] PR description cites the ticket, a screenshot/video, and the test plan.
- [ ] At least one peer review approval.
- [ ] Behind a feature flag if user-visible and not in the current phase's scope.
- [ ] Storybook updated for any new UI primitive.
- [ ] Docs updated if public API (hook, util, component) changed.

### 33.2 Release Definition of Done

Before cutting a production release:

- [ ] `main` is green (lint, typecheck, unit, e2e, lighthouse).
- [ ] No open P1/P2 bugs for the release scope.
- [ ] Changelog generated and reviewed.
- [ ] Source maps uploaded to Sentry, tagged with release version.
- [ ] Feature flags for the release set to their intended production defaults.
- [ ] Product + design sign-off on a manual smoke test against staging.
- [ ] Rollback plan confirmed (Vercel previous deploy identified, or flag kill-switch named).
- [ ] On-call engineer aware and available for 2 hours post-deploy.

### 33.3 Quarterly health checks

Independent of feature work, run a checklist once per quarter:

- Dependency audit — bump majors that have been held.
- Accessibility re-audit (full NVDA + VoiceOver pass, not just CI).
- Performance review — RUM trends, bundle size trend, API latency trend from Sentry Performance.
- Security review — CSP and cookie flags unchanged, secret scanning clean, no new high-severity advisories.
- Test suite hygiene — quarantine and fix flaky tests (any test that failed > 2× in 30 days without a real regression).

---

## 34. Appendices

Reference material for implementation and onboarding.

### 34.1 API endpoint → frontend hook mapping

This table is the authoritative index between Trackora's backend API and the frontend's hooks. Keep in sync when adding endpoints.

| Method | Endpoint | Hook | Invalidates on success |
|---|---|---|---|
| POST | `/auth/login/` | `useLogin()` | `['auth']` |
| POST | `/auth/refresh/` | internal (interceptor) | — |
| POST | `/auth/logout/` | `useLogout()` | `['auth']`, entire cache |
| GET | `/users/me/` | `useCurrentUser()` | — |
| GET | `/users/` | `useUsers(filters)` | — |
| GET | `/users/:id/` | `useUser(id)` | — |
| POST | `/users/` | `useCreateUser()` | `['users','list']` |
| PATCH | `/users/:id/` | `useUpdateUser()` | `['users','list']`, `['users','detail',id]` |
| GET | `/tasks/` | `useTasks(filters)` | — |
| GET | `/tasks/:id/` | `useTask(id)` | — |
| POST | `/tasks/` | `useCreateTask()` | `['tasks','list']`, `['tasks','stats']` |
| PATCH | `/tasks/:id/` | `useUpdateTask()` | `['tasks','list']`, `['tasks','detail',id]` |
| POST | `/tasks/:id/start/` | `useStartTask()` | `['tasks','detail',id]`, `['tasks','list']` |
| POST | `/tasks/:id/complete/` | `useCompleteTask()` | `['tasks','detail',id]`, `['tasks','list']`, `['tasks','stats']` |
| POST | `/tasks/:id/approve/` | `useApproveTask()` | `['tasks','detail',id]`, `['tasks','list']`, `['tasks','stats']` |
| POST | `/tasks/:id/reject/` | `useRejectTask()` | `['tasks','detail',id]`, `['tasks','list']` |
| POST | `/tasks/:id/reopen/` | `useReopenTask()` | `['tasks','detail',id]`, `['tasks','list']` |
| POST | `/tasks/:id/cancel/` | `useCancelTask()` | `['tasks','detail',id]`, `['tasks','list']` |
| GET | `/tasks/stats/` | `useTaskStats()` (staleTime 5 min) | — |
| GET | `/tasks/:id/comments/` | `useComments(taskId)` | — |
| POST | `/tasks/:id/comments/` | `useCreateComment(taskId)` | `['comments',taskId]` (optimistic) |
| PATCH | `/comments/:id/` | `useUpdateComment()` | `['comments',taskId]` |
| DELETE | `/comments/:id/` | `useDeleteComment()` | `['comments',taskId]` |
| GET | `/tasks/:id/attachments/` | `useAttachments(taskId)` | — |
| POST | `/tasks/:id/attachments/` | `useUploadAttachment(taskId)` | `['attachments',taskId]` |
| DELETE | `/attachments/:id/` | `useDeleteAttachment()` | `['attachments',taskId]` |
| GET | `/notifications/` | `useNotifications()` (polled + SSE in phase 5) | — |
| PATCH | `/notifications/:id/read/` | `useMarkNotificationRead()` | `['notifications']` |
| POST | `/notifications/read-all/` | `useMarkAllRead()` | `['notifications']` |
| GET | `/notifications/preferences/` | `useNotificationPrefs()` | — |
| PATCH | `/notifications/preferences/` | `useUpdateNotificationPrefs()` | `['notifications','preferences']` |

### 34.2 Scaffolding commands

From a clean directory:

```bash
# 1. Create the project
pnpm create vite@latest trackora-web -- --template react-ts
cd trackora-web

# 2. Install core dependencies
pnpm add react-router-dom @tanstack/react-query @tanstack/react-query-devtools \
  zustand axios zod react-hook-form @hookform/resolvers \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover \
  @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-tooltip \
  class-variance-authority clsx tailwind-merge lucide-react \
  @sentry/react web-vitals \
  i18next react-i18next i18next-http-backend i18next-browser-languagedetector i18next-icu \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  dompurify marked date-fns

# 3. Dev dependencies
pnpm add -D @vitejs/plugin-react vite-tsconfig-paths \
  typescript @types/react @types/react-dom @types/node @types/dompurify \
  tailwindcss postcss autoprefixer prettier prettier-plugin-tailwindcss \
  eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks \
  eslint-plugin-jsx-a11y eslint-plugin-import eslint-plugin-i18next \
  vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom jest-axe msw \
  @playwright/test @axe-core/playwright \
  husky lint-staged @commitlint/cli @commitlint/config-conventional \
  size-limit @size-limit/preset-app \
  openapi-typescript @sentry/cli \
  storybook @storybook/react-vite @storybook/addon-a11y @storybook/addon-interactions

# 4. Initialize tooling
pnpm dlx tailwindcss init -p
pnpm dlx shadcn-ui@latest init
pnpm dlx husky init
pnpm dlx playwright install --with-deps
pnpm dlx storybook@latest init

# 5. Generate API types from staging
pnpm gen:api

# 6. Run it
pnpm dev
```

### 34.3 Environment file template

```bash
# .env.example — copy to .env.local and fill in

# Required
VITE_API_URL=https://staging.trackora.app/api/v1
VITE_APP_VERSION=dev

# Optional — leave empty to disable locally
VITE_SENTRY_DSN=
VITE_VITALS_URL=
VITE_LAUNCHDARKLY_CLIENT_ID=

# Feature flags (fallbacks if LaunchDarkly unavailable)
VITE_FLAG_KANBAN=true
VITE_FLAG_REALTIME_SSE=false
```

### 34.4 Troubleshooting FAQ

**Q: `pnpm dev` fails with "Cannot find module '@/features/...'"**
A: Check `tsconfig.json` has `paths` configured and `vite-tsconfig-paths` is in `vite.config.ts` plugins. Restart the dev server after changes to `tsconfig.json`.

**Q: Tests fail with "ReferenceError: crypto is not defined"**
A: Node < 20. Upgrade via `.nvmrc` (`nvm use`). Vitest with jsdom 24+ needs Node 20+ for `crypto.randomUUID`.

**Q: MSW isn't intercepting my request in a test.**
A: Check `setupFiles` in `vitest.config.ts` points at the setup file. Check the handler URL matches exactly (MSW does not match on path params by default — use `:id` syntax).

**Q: React Query cache isn't invalidating after my mutation.**
A: The mutation's `onSuccess` must call `queryClient.invalidateQueries({ queryKey: ... })` with a key that is a **prefix** of the queries you want to invalidate. If your detail key is `['tasks','detail',42]`, invalidating `['tasks']` invalidates it; invalidating `['tasks','list']` does not.

**Q: Sentry isn't receiving events from production.**
A: Check (1) `VITE_SENTRY_DSN` is set at build time, not runtime — Vite inlines env vars at build. (2) Ad blockers block Sentry's ingestion host; this is expected and not a bug. (3) CSP `connect-src` must include `https://*.ingest.sentry.io`.

**Q: Lighthouse CI passes locally but fails in CI.**
A: Preview URL must be fully deployed and warm before Lighthouse runs against it. Add a `sleep 15` or use Lighthouse CI's `startServerReadyPattern`.

**Q: My Playwright test passes locally but flakes in CI.**
A: Almost always a timing issue. Never use `page.waitForTimeout` — use `page.getByRole(...).waitFor()` or `expect(locator).toBeVisible()` which have built-in retry. If a test flakes twice in a week, it is flaky; quarantine it and fix.

**Q: Bundle size gate failed — what now?**
A: Run `pnpm analyze` to open the bundle visualizer. Look for (1) accidentally imported huge library (moment.js, lodash whole), (2) missing dynamic `import()` on a route, (3) a dependency that duplicates something already in the bundle.

**Q: The backend returns `409 InvalidWorkflowTransitionError` and my UI shows a generic error.**
A: Verify the error is reaching the `ApiError` class (Part 1 § 5.3) and that the specific error type is handled in the relevant hook's `onError`. See Part 2 § 13.3 for the pattern of mapping workflow errors to inline messages.

### 34.5 Reading order for new engineers

1. [Part 1 §§ 1–2](./01_architecture.md) — Architectural principles (30 min).
2. This document, § 32.3 — Clone, install, run.
3. [Part 1 §§ 4, 5, 6](./01_architecture.md) — Project structure, API layer, state management (1 hour).
4. [Part 2 § 10, 12](./02_features.md) — Read the auth and task-list feature code as the canonical examples (1 hour).
5. [Part 3 § 25](./03_quality.md) — Testing conventions (30 min).
6. Pick a good-first-issue ticket and ship it.

### 34.6 Glossary

| Term | Meaning in this codebase |
|---|---|
| **Feature slice** | A directory under `src/features/` with `api`, `hooks`, `components`, `schemas`, `types`, and an `index.ts` public barrel. |
| **Query key** | A TanStack Query cache key, always produced by the factory in `shared/api/queryKeys.ts`. Never inlined. |
| **Server state** | Data owned by the backend; lives in TanStack Query cache; never mirrored into Zustand. |
| **Client state** | UI-only state (modal open, theme); lives in Zustand or component state. |
| **URL state** | State that should survive reload and be shareable; lives in search params via `useSearchParams`. |
| **Ability** | A named permission checked via `useCan(action, resource?)`; resolved against role matrix + resource rules. |
| **Correlation ID** | A UUID attached to every outbound request via `X-Correlation-ID`, echoed on errors, used to correlate frontend Sentry events with backend logs. |
| **Optimistic update** | Updating the cache immediately on mutation start, rolling back on error. Used for comments and Kanban moves. |

---

**End of Trackora Frontend Plan.**

Parts in this plan:
- [Part 1 — Architecture](./01_architecture.md) — principles, stack, project structure, API, state, auth, routing, design system.
- [Part 2 — Features](./02_features.md) — every user-facing feature, forms, realtime, performance, error handling.
- [Part 3 — Quality](./03_quality.md) — testing, security, observability, accessibility, i18n, developer experience.
- **Part 4 — Delivery** (this document) — CI/CD, phased roadmap, definition of done, appendices.



