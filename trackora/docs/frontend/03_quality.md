# Trackora Frontend — Part 3: Quality, Security & Developer Experience

> **Scope.** This document covers sections 25–30 of the Trackora frontend plan: testing strategy, security, observability, accessibility, internationalization, and developer experience. It builds directly on the architecture decisions in [Part 1](./01_architecture.md) and the feature implementations in [Part 2](./02_features.md).
>
> **Audience.** Senior React engineers joining the Trackora web client team. All recommendations are opinionated and tied to the real Trackora backend contract.

---

## 25. Testing Strategy

### 25.1 The testing pyramid for Trackora

We enforce a deliberate pyramid shape. Spending equally across all layers is a common failure mode — E2E tests are slow and flaky, unit tests are cheap and precise.

| Layer | Tool | Share of suite | What it tests | Runtime budget |
|---|---|---|---|---|
| **Unit** | Vitest | ~70% | Pure functions, hooks in isolation, Zod schemas, reducers, utility modules | < 30s local |
| **Component** | Vitest + RTL | ~20% | Single components with mocked props; accessibility roles; user-event flows | < 60s local |
| **Integration** | Vitest + RTL + MSW | ~8% | Feature slices hitting mocked HTTP endpoints; query cache behavior | < 2 min local |
| **End-to-end** | Playwright | ~2% | Critical user journeys against real backend or staging | < 10 min CI |

**Rule.** If a bug can be caught by a lower layer, it must be. E2E tests exist only for journeys that cross many features (login → create task → assign → start → complete).

### 25.2 Unit tests with Vitest

Vitest is chosen over Jest: native ESM, shares Vite's transform pipeline (no duplicate config), 2–5× faster cold start, TypeScript first-class.

**`vitest.config.ts`:**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.stories.tsx', '**/*.d.ts', 'src/test/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**Example — schema test:**

```ts
// src/features/tasks/schemas/taskCreate.schema.test.ts
import { describe, it, expect } from 'vitest';
import { taskCreateSchema } from './taskCreate.schema';

describe('taskCreateSchema', () => {
  it('rejects titles shorter than 10 chars', () => {
    const r = taskCreateSchema.safeParse({ title: 'short', sla_hours: 24 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(['title']);
  });

  it('rejects past due_date', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const r = taskCreateSchema.safeParse({
      title: 'Valid title for task',
      due_date: yesterday,
      sla_hours: 24,
    });
    expect(r.success).toBe(false);
  });
});
```

### 25.3 Component tests with React Testing Library

**Rule.** Query by accessible role/name, never by class or test-id unless unavoidable. If a component can't be queried by role, it's likely not accessible — fix the component, not the test.

```tsx
// src/features/auth/components/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('<LoginForm />', () => {
  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={vi.fn()} />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'notanemail');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('calls onSubmit with credentials when valid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@b.co');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co', password: 'password123' });
  });
});
```

### 25.4 Integration tests with MSW

Mock Service Worker intercepts at the network layer — tests exercise the real axios client, real query keys, real error normalization. The only thing mocked is the HTTP response.

**Setup:**

```ts
// src/test/msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/v1/auth/login/', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { error: 'invalid_credentials', message: 'Invalid email or password', type: 'AuthenticationError' },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      access: 'fake-access-token',
      refresh: 'fake-refresh-token',
      user: { id: 1, email: body.email, role: 'CONTRIBUTOR' },
    });
  }),

  http.get('/api/v1/tasks/', () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
  ),
];
```

```ts
// src/test/setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './msw/handlers';
import '@testing-library/jest-dom/vitest';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Setting `onUnhandledRequest: 'error'` is critical — it forces tests to declare every endpoint they depend on. Silent passes on unmocked requests hide real coupling.

### 25.5 End-to-end tests with Playwright

Playwright runs critical journeys against a real dev server pointed at a seeded backend (docker-compose). Run nightly + pre-release, not on every PR (too slow).

**Critical journeys covered:**
1. Login → dashboard loads → logout.
2. Create task → assign to self → start → complete.
3. Reviewer rejects completed task → creator edits → resubmits.
4. Manager approves task via Kanban drag.
5. Comment with @mention → mentioned user sees notification.

**`playwright.config.ts`:**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 25.6 Accessibility testing in CI

Every component test runs axe-core via `jest-axe`:

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no a11y violations', async () => {
  const { container } = render(<TaskCard task={mockTask} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

Playwright runs `@axe-core/playwright` on every critical page — fails the build on any violation at severity `serious` or higher.

### 25.7 Contract tests against OpenAPI schema

To catch backend drift early, a CI job validates that generated types match the deployed schema:

```bash
# Fetch current staging schema
curl https://staging.trackora.app/api/schema/ -o schema.yaml
# Regenerate types
pnpm openapi-typescript schema.yaml -o src/shared/api/generated/schema.ts
# Fail if there's a diff vs committed version
git diff --exit-code src/shared/api/generated/schema.ts
```

If this job fails on main, the backend has shipped a breaking change without a coordinated frontend update.

### 25.8 Visual regression (optional, phase 3+)

Chromatic + Storybook catches unintended visual changes in the design system. Not required for initial launch; adopt once component library stabilizes.

### 25.9 What we explicitly don't test

- **Third-party libraries** (TanStack Query, React Router). They have their own test suites.
- **CSS in isolation.** Visual regression handles this in phase 3; unit-testing CSS is low-value.
- **Generated code** (OpenAPI types, Tailwind output).
- **Trivial getters/setters.** Coverage % is a floor, not a goal.

---

## 26. Security

Frontend security is about reducing the blast radius of bugs and hostile input, not preventing all attacks (the backend is the last line of defense). The threats we actually face: XSS, token theft, CSRF (on session-auth endpoints), dependency supply chain, and clickjacking.

### 26.1 Token storage — the actual decision and why

Reaffirming the decision from [Part 1 § 7.2](./01_architecture.md#72-jwt-token-lifecycle):

| Storage | XSS risk | CSRF risk | Persistence across tabs | Chosen? |
|---|---|---|---|---|
| `localStorage` | **High** (any script reads it) | None | Yes | ❌ |
| `sessionStorage` | High | None | No | ❌ |
| **In-memory (module variable)** | **Low** (script must execute in same window) | None | No (refreshed via refresh token cookie) | ✅ for access token |
| `httpOnly; Secure; SameSite=Strict` cookie | None | Needs CSRF token | Yes | ✅ for refresh token |

**Concrete implementation.** Access token lives in a module-scoped variable inside `shared/api/auth-store.ts`. Refresh token lives in an httpOnly cookie set by the backend on login. On page reload, the SPA calls `POST /auth/refresh/` — the cookie is sent automatically, a new access token is returned and placed in memory.

**What this buys us.** An XSS payload can steal whatever is in memory *for that page load*, but can't exfiltrate the refresh token or persist the compromise across reloads. Acceptable trade-off given backend CSRF protection on the refresh endpoint.

**Backend requirement (call out to backend team).** The `/auth/refresh/` endpoint must:
- Set refresh token as `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/`.
- Require a CSRF token (double-submit cookie or header) to defend against cross-site refresh abuse.

Currently Trackora's `SimpleJWT` config returns refresh tokens in the response body. This needs to change — filed as a backend follow-up.

### 26.2 XSS defenses

React escapes by default, but three escape hatches re-enable XSS:

1. **`dangerouslySetInnerHTML`** — banned except in the Markdown renderer for comment bodies. The renderer uses `DOMPurify`:

    ```tsx
    import DOMPurify from 'dompurify';
    import { marked } from 'marked';

    export function CommentBody({ raw }: { raw: string }) {
      const clean = DOMPurify.sanitize(marked.parse(raw) as string, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'br'],
        ALLOWED_ATTR: ['href'],
      });
      return <div className="prose" dangerouslySetInnerHTML={{ __html: clean }} />;
    }
    ```

    ESLint rule `react/no-danger` is set to `error` with an allow-list of one file.

2. **`href={userInput}`** — potential `javascript:` URL injection. All user-supplied URLs pass through a validator:

    ```ts
    export function safeHref(url: string): string | undefined {
      try {
        const u = new URL(url, window.location.origin);
        if (u.protocol !== 'http:' && u.protocol !== 'https:' && u.protocol !== 'mailto:') {
          return undefined;
        }
        return u.toString();
      } catch {
        return undefined;
      }
    }
    ```

3. **`eval` / `new Function` / inline event handlers assembled from strings** — banned via ESLint (`no-eval`, `no-implied-eval`, `no-new-func`).

### 26.3 Content Security Policy

Set by the static host (Nginx / CloudFront / Netlify — see [Part 4 § 31](./04_roadmap.md#31-cicd-pipeline)). A strict baseline:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.trackora.app;
  font-src 'self';
  connect-src 'self' https://api.trackora.app https://*.ingest.sentry.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**Notes:**
- `'unsafe-inline'` on `style-src` is required by Tailwind JIT's generated utility classes and shadcn/ui's inline style use for animations. Acceptable because CSS-only XSS is severely limited.
- `'wasm-unsafe-eval'` exists so that Sentry's stack-frame symbolication works.
- `frame-ancestors 'none'` defends against clickjacking — Trackora is never embedded as an iframe.

### 26.4 Other response headers

Configured at the static host, not in the SPA:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 26.5 Dependency hygiene

- **Renovate** (not Dependabot — Renovate's grouping and scheduling are better). Weekly non-breaking patch/minor PRs, held for manual review on major upgrades.
- **`pnpm audit`** runs in CI; fails on `high` or `critical`.
- **Provenance pinning.** `.npmrc` sets `save-exact=true` so versions are pinned; `pnpm-lock.yaml` is committed and enforced by CI (`--frozen-lockfile`).
- **`pnpm audit signatures`** verifies package signatures weekly.
- **License scanning** via `license-checker` — reject GPL/AGPL transitive deps.

### 26.6 Build & deploy supply-chain

- **Subresource Integrity (SRI)** for any externally hosted script (we have none today; baseline holds).
- **Reproducible builds.** Pin Node via `.nvmrc`, pnpm via `packageManager` in `package.json`.
- **Container image scanning** via Trivy in CI (if we ship a Docker image for Nginx static hosting).
- **Signed releases.** CI publishes source-map archives to Sentry and tags Git releases; both signed by the GitHub Actions OIDC identity, not a shared secret.

### 26.7 What to do when a secret leaks

1. Treat any API token committed to the repo as compromised within seconds — bots scan GitHub within minutes.
2. Rotate the credential immediately, do not merely remove the commit.
3. Use `git filter-repo` to purge if the credential type is non-rotatable (rare).
4. Add the pattern to `gitleaks` pre-commit config so it can't recur.

`gitleaks` runs in CI and as a Husky `pre-push` hook.

### 26.8 Trackora-specific threat model notes

- **File uploads** (attachments, § [Part 2 § 17](./02_features.md#17-attachments)). Frontend enforces MIME/size mirroring backend; final decision is backend's. Never render uploaded HTML/SVG in-browser without sanitization — preview images only via `<img>` with a sandboxed origin.
- **User-generated Markdown in comments** — already sanitized (see § 26.2).
- **Admin role escalation.** Client-side role checks (`useCan`) are UX only. Every mutation must be authorized server-side; the frontend assumes the backend is the authority.

---

## 27. Observability

You cannot fix what you cannot see. A frontend without observability is a black box — users report "it's slow" and you have nothing to act on.

### 27.1 The three pillars, applied to SPAs

| Pillar | Backend equivalent | Frontend tool | What we capture |
|---|---|---|---|
| **Errors** | Sentry Python SDK | `@sentry/react` | Uncaught exceptions, unhandled rejections, React error boundary triggers, failed mutations |
| **Metrics** | Prometheus | `web-vitals` → Sentry Performance | LCP, INP, CLS, FCP, TTFB, custom marks (time-to-task-list) |
| **Traces** | OpenTelemetry | Sentry Performance + `X-Correlation-ID` | Page loads, route transitions, API call spans linked to backend spans |

### 27.2 Sentry setup

```ts
// src/shared/observability/sentry.ts
import * as Sentry from '@sentry/react';
import { createBrowserRouter } from 'react-router-dom';

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Drop noisy browser extension errors
      const err = hint.originalException;
      if (err instanceof Error && /extension:\/\//.test(err.stack ?? '')) {
        return null;
      }
      return event;
    },
  });
}
```

**Sample rates explained:**
- `tracesSampleRate: 0.1` — 10% of transactions traced in prod. Full tracing is expensive and quota-burning.
- `replaysSessionSampleRate: 0.0` + `replaysOnErrorSampleRate: 1.0` — never record random sessions, always record sessions where an error occurred. Best trade-off of privacy × diagnostic value.
- `maskAllText: true` — PII protection on replays.

### 27.3 Correlation ID propagation

Every outbound request carries `X-Correlation-ID` (generated client-side via `crypto.randomUUID()`). The backend's `CorrelationIdMiddleware` picks it up and echoes it on responses. This binds frontend and backend traces together.

```ts
// src/shared/api/client.ts (excerpt — full version in Part 1 § 5.2)
client.interceptors.request.use((config) => {
  const correlationId = crypto.randomUUID();
  config.headers.set('X-Correlation-ID', correlationId);
  Sentry.getCurrentScope().setTag('correlation_id', correlationId);
  return config;
});
```

When a user reports "my task save failed at 3:14pm", you can:
1. Find the Sentry event → read its `correlation_id` tag.
2. Grep backend logs for that UUID → see the exact request, SQL, and exception.

### 27.4 Web vitals reporting

```ts
// src/shared/observability/vitals.ts
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

export function reportWebVitals() {
  const report = (metric: { name: string; value: number; id: string }) => {
    Sentry.getCurrentScope().setMeasurement(metric.name, metric.value, 'millisecond');
    // Also beacon to our own analytics if configured
    if (navigator.sendBeacon && import.meta.env.VITE_VITALS_URL) {
      navigator.sendBeacon(
        import.meta.env.VITE_VITALS_URL,
        JSON.stringify({ ...metric, url: window.location.pathname }),
      );
    }
  };
  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
```

**Targets** (from [Part 2 § 23](./02_features.md#23-performance-engineering)): LCP < 2.5s, INP < 200ms, CLS < 0.1 at the 75th percentile.

### 27.5 Custom business metrics

Beyond generic web vitals, track domain-specific signals:

```ts
// Example: time from click-"Create task" to form ready
performance.mark('task-create-click');
// ... after form renders
performance.mark('task-create-ready');
performance.measure('task-create-open', 'task-create-click', 'task-create-ready');

const measure = performance.getEntriesByName('task-create-open')[0];
Sentry.getCurrentScope().setMeasurement('task-create-open', measure.duration, 'millisecond');
```

**Key custom metrics to track:**
- `login-to-dashboard-ready` — signup funnel health.
- `task-list-time-to-interactive` — list page perf over time.
- `kanban-drag-to-persisted` — responsiveness of the most latency-sensitive interaction.
- `search-input-to-results` — filter debounce + server latency.

### 27.6 Source maps

Source maps are uploaded to Sentry during CI — never served publicly:

```bash
# In CI after `pnpm build`
pnpm sentry-cli sourcemaps inject ./dist
pnpm sentry-cli sourcemaps upload --release=$VITE_APP_VERSION ./dist
# Then delete maps before deploying static assets
find ./dist -name '*.map' -delete
```

Vite config sets `build.sourcemap: 'hidden'` — maps are generated but not referenced from bundles.

### 27.7 Logging discipline in the client

Client-side `console.log` is for development; it has no place in production user sessions. Rules:
- ESLint rule `no-console` set to `error` except for `console.warn` and `console.error`.
- All user-facing "errors we handled gracefully" route through a `logger` utility that forwards to Sentry as `captureMessage` with level `warning`.
- Debug logs behind `import.meta.env.DEV` branches are fine — they tree-shake out.

```ts
// src/shared/observability/logger.ts
import * as Sentry from '@sentry/react';

export const logger = {
  info(msg: string, ctx?: Record<string, unknown>) {
    if (import.meta.env.DEV) console.info(msg, ctx);
  },
  warn(msg: string, ctx?: Record<string, unknown>) {
    Sentry.captureMessage(msg, { level: 'warning', extra: ctx });
  },
  error(err: unknown, ctx?: Record<string, unknown>) {
    Sentry.captureException(err, { extra: ctx });
  },
};
```

### 27.8 Dashboards & alerts

Configure in Sentry, reviewed weekly:

| Alert | Condition | Channel |
|---|---|---|
| Error spike | Error rate > 2× 7-day baseline for 10 min | Slack `#trackora-oncall` |
| New issue | First occurrence in production release | Slack `#trackora-oncall` |
| LCP regression | p75 LCP > 3.0s for 30 min | Slack `#trackora-frontend` |
| API 5xx burst | > 10 `5xx` in 5 min | PagerDuty |

---

## 28. Accessibility

Accessibility is not a compliance checkbox — it's a quality signal. An app that screen readers can navigate is also an app with correct semantic structure, predictable focus management, and honest UI state. These same properties make automated testing easier and reduce bugs for everyone.

### 28.1 Target: WCAG 2.1 Level AA

Specifically:
- **Perceivable.** Color contrast ≥ 4.5:1 text / 3:1 UI, all non-text content has alternatives.
- **Operable.** Every feature usable from keyboard alone, no keyboard traps, focus visible, no content flashes > 3× per second.
- **Understandable.** Labels and instructions on every input, errors identified in text.
- **Robust.** Valid HTML, correct ARIA, works with assistive technology (tested with NVDA + VoiceOver).

### 28.2 The accessibility foundation is components, not pages

We chose shadcn/ui + Radix Primitives specifically because Radix ships correct keyboard handling, focus management, and ARIA for every primitive (Dialog, Menu, Combobox, Select, etc.). This means a11y is a property of our component library, and most feature code inherits it.

**Rule.** Never hand-roll an interactive primitive (dropdown, tabs, dialog, tooltip). Use Radix. Custom-built primitives are the #1 source of a11y bugs.

### 28.3 Keyboard navigation checklist

Every interactive element must:
- Be reachable via `Tab` in logical order (DOM order ≈ visual order).
- Activate on `Enter` (buttons, links) or `Space` (buttons, checkboxes).
- Show a visible focus ring (Tailwind `focus-visible:ring-2 focus-visible:ring-ring`).
- Not trap focus unless it's a modal (Radix handles this correctly).

**Specific patterns:**

| UI pattern | Keyboard contract |
|---|---|
| Kanban card drag | `Space` to pick up, arrow keys to move, `Space` to drop, `Esc` to cancel (@dnd-kit's `KeyboardSensor` — [Part 2 § 14](./02_features.md#14-kanban-board)) |
| Data table row actions | `Tab` to row, `Enter` opens detail, row-level menu opened via a dedicated button |
| Combobox (assignee picker) | `↓ ↑` to navigate, `Enter` to select, `Esc` to close, typing filters |
| Dialog | Focus trap, `Esc` closes, focus returns to trigger |
| Toast | Does not steal focus; an "undo" toast has a focusable button reachable via screen reader announcement |

### 28.4 Screen reader support

- Every form input has an associated `<label>` (or `aria-labelledby` / `aria-label` when a visible label is absent).
- Form validation errors use `aria-describedby` pointing to the error text, plus `aria-invalid="true"` on the input.
- Live regions (`aria-live="polite"` for status, `aria-live="assertive"` for errors) announce mutations results (e.g., "Task created", "Failed to save").
- Icon-only buttons have `aria-label` (or a visible text label — prefer the latter).

```tsx
// src/shared/ui/FormField.tsx — a11y-correct field wrapper
export function FormField({
  label, error, hint, children, id,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined,
      })}
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

### 28.5 Color & contrast

- Design tokens (Part 1 § 9.3) pass AA against their background by construction — checked via `npx tailwindcss-a11y-contrast` in CI.
- Color is never the sole carrier of meaning. Status uses color **+** icon **+** text. SLA risk uses color **+** label (`Due in 2h`).
- Dark mode tokens re-verified for contrast — this is a common regression point.

### 28.6 Motion & reduced preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Also honored in JS where Framer Motion / transition libraries are used:

```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### 28.7 Testing a11y

Three layers (already described in § 25):
1. **`jest-axe`** in component tests — catches missing labels, invalid ARIA, contrast failures.
2. **`@axe-core/playwright`** in E2E — catches page-level issues (duplicate landmarks, heading hierarchy).
3. **Manual screen-reader pass** before each release — NVDA + Firefox on Windows, VoiceOver + Safari on macOS. Test the top 5 journeys end-to-end.

### 28.8 Accessibility statement

Publish `/accessibility` page documenting:
- Conformance target (WCAG 2.1 AA).
- Known issues and workarounds.
- Contact for reporting issues.

This is a legal requirement in some jurisdictions (EU EAA, US Section 508 for government clients) and a trust signal everywhere.

---

## 29. Internationalization

Internationalization (i18n) is cheap to add early and expensive to retrofit. Even if Trackora ships English-only at launch, we structure all user-facing strings for translation from day one.

### 29.1 Tooling: `react-i18next` + ICU MessageFormat

- **`react-i18next`** — de-facto standard, integrates with Suspense, supports namespaces for code-splitting translation bundles per feature.
- **ICU MessageFormat** (via `i18next-icu`) — handles plurals, gender, nested interpolation correctly across languages. `"{count, plural, one {# task} other {# tasks}}"` works in English, Russian, Arabic, etc.

### 29.2 Project layout

```
src/
  shared/
    i18n/
      index.ts           # i18next init
      resources/
        en/
          common.json
          tasks.json
          auth.json
          errors.json
```

Each feature ships its own namespace JSON. Lazy-loaded per route — Spanish users don't download the German bundle.

### 29.3 Init

```ts
// src/shared/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ICU from 'i18next-icu';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(ICU)
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'de', 'ja'],
    ns: ['common'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'trackora.lang',
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: true },
  });

export default i18n;
```

### 29.4 Usage rules

```tsx
// ✅ correct
const { t } = useTranslation('tasks');
return <h1>{t('detail.title', { title: task.title })}</h1>;

// ❌ banned — string concatenation breaks translators
return <h1>{t('detail.prefix')} {task.title}</h1>;

// ❌ banned — JSX inside keys
return <>{t('info')}</>; // with <strong> embedded
// use <Trans> instead:
return <Trans i18nKey="info"><strong>Note:</strong> Your task is saved.</Trans>;
```

ESLint rule `i18next/no-literal-string` catches hard-coded user-visible strings in JSX.

### 29.5 Locale-aware formatting

Never hand-format dates or numbers. Use the platform `Intl` API via thin wrappers:

```ts
// src/shared/i18n/format.ts
export const formatDate = (d: Date | string, lng: string) =>
  new Intl.DateTimeFormat(lng, { dateStyle: 'medium' }).format(new Date(d));

export const formatRelative = (d: Date | string, lng: string) => {
  const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  if (Math.abs(diff) < 60) return rtf.format(Math.round(diff), 'second');
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
};

export const formatNumber = (n: number, lng: string) =>
  new Intl.NumberFormat(lng).format(n);
```

### 29.6 RTL support (Arabic, Hebrew)

Not required at launch, but we avoid painting ourselves into a corner:
- Tailwind `rtl:` variant used for any directional padding/margin (`rtl:pr-4 ltr:pl-4`) — or simply `ps-4 pe-4` (logical properties, zero overhead).
- `<html dir={isRTL ? 'rtl' : 'ltr'} lang={lng}>` toggled at i18n language change.
- Icons with directional meaning (chevrons, arrows) mirror via `rtl:scale-x-[-1]`.

### 29.7 Translation workflow

1. Developers add new keys to `en/*.json` during feature work.
2. CI job (`i18n-lint`) fails if a key exists in a non-`en` file but not in `en`, or vice versa after a grace period.
3. Weekly export to translation vendor (Crowdin or Lokalise) via their CLI.
4. Translated files land back as a PR.

### 29.8 Pluralization parity with backend

Backend error messages (notifications, email digests) are rendered server-side and thus need their own translation. The frontend and backend share the **key namespace convention** (`errors.task.sla_exceeded`) but maintain separate translation files. Call out to the backend team to adopt the same key convention for consistency.

---

## 30. Developer Experience & Tooling

Fast, reliable tooling compounds. Every second saved on build / lint / test per iteration multiplies across the team and lifetime of the project.

### 30.1 TypeScript config — strict and then some

```jsonc
// tsconfig.json (excerpt)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

**Non-obvious flags explained:**
- `noUncheckedIndexedAccess` — `arr[0]` has type `T | undefined`. Eliminates a whole class of runtime errors.
- `exactOptionalPropertyTypes` — forces authors to decide whether a field is "missing" or "explicitly undefined". Catches API contract bugs.
- `verbatimModuleSyntax` — requires `import type` for type-only imports. Speeds up bundlers and prevents accidental side-effect imports.

### 30.2 ESLint flat config

```ts
// eslint.config.ts
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, import: importPlugin },
    languageOptions: { parserOptions: { project: './tsconfig.json' } },
    rules: {
      // a11y
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      // react
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // layering — enforces FSD boundaries (Part 1 § 4)
      'import/no-restricted-paths': ['error', {
        zones: [
          { target: './src/shared', from: './src/features', message: 'shared may not import from features' },
          { target: './src/shared', from: './src/pages', message: 'shared may not import from pages' },
          { target: './src/features', from: './src/pages', message: 'features may not import from pages' },
          { target: './src/features/*/!(index.ts)', from: './src/features/*/!(index.ts)', message: 'cross-feature imports must go through the public index.ts' },
        ],
      }],
      // security
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'react/no-danger': 'error',
      // discipline
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
);
```

The layering rules make the architecture self-enforcing — new hires cannot accidentally create a cross-feature dependency without CI failing.

### 30.3 Prettier

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

The Tailwind plugin auto-sorts class names in canonical order — removes bikeshedding in review and produces smaller diffs.

### 30.4 Git hooks with Husky + lint-staged

```jsonc
// .lintstagedrc.json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,yml}": ["prettier --write"]
}
```

```bash
# .husky/pre-commit
pnpm lint-staged

# .husky/commit-msg
pnpm commitlint --edit $1

# .husky/pre-push
pnpm typecheck
pnpm gitleaks protect --staged
```

**Rule.** Hooks never run the full test suite on pre-commit — it's too slow and breaks flow. Full tests run in CI.

### 30.5 Commit conventions

Conventional Commits enforced via `commitlint`:

```
feat(tasks): add kanban drag confirmation
fix(auth): prevent refresh token race on tab focus
chore(deps): bump @tanstack/react-query to 5.51
```

Enables automated `CHANGELOG.md` generation via `release-please` or `changesets`.

### 30.6 Storybook

Storybook 8 with Vite builder — starts in < 3s. Every UI primitive and most feature components have a story. Addons:
- `@storybook/addon-a11y` — per-story axe-core run.
- `@storybook/addon-interactions` — play functions for user-event flows in-browser.
- `@storybook/test-runner` — runs stories as tests in CI.
- `@chromatic-com/storybook` — visual regression (phase 3+).

**Rule.** If a component has more than two visible states (hover, error, loading), it has a story. Stories double as living documentation.

### 30.7 VS Code workspace settings

```jsonc
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

```jsonc
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

### 30.8 Scripts (`package.json`)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings=0",
    "format": "prettier --write .",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test",
    "storybook": "storybook dev -p 6006",
    "storybook:build": "storybook build",
    "gen:api": "openapi-typescript https://staging.trackora.app/api/schema/ -o src/shared/api/generated/schema.ts",
    "analyze": "vite build --mode analyze"
  }
}
```

### 30.9 Onboarding checklist for new engineers

A new hire should be productive on day one. The README must guide them through:

1. Install Node via `.nvmrc`, pnpm via Corepack.
2. `pnpm install`.
3. Copy `.env.example` → `.env.local`, fill in `VITE_API_URL` (staging).
4. `pnpm dev` — app runs at `http://localhost:5173`.
5. `pnpm test` — all green.
6. `pnpm storybook` — component catalog.
7. Open the first "good-first-issue" ticket.

If any of these steps breaks, it's a P1 bug on the tooling team.

---

**Next:** See [Part 4 — Delivery, CI/CD & Roadmap](./04_roadmap.md) for the CI pipeline, phased rollout plan, definition of done, and reference appendices.





