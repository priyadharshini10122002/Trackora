# Trackora Frontend — Part 1: Architecture & Foundations

> **Series:** Enterprise React Frontend Plan for Trackora (4 parts)
> - **Part 1 — Architecture & Foundations** (this file)
> - Part 2 — Feature Implementation (`02_features.md`)
> - Part 3 — Quality, Security & Observability (`03_quality.md`)
> - Part 4 — Roadmap & Delivery (`04_roadmap.md`)
>
> **Audience:** Senior React engineers building the Trackora web client. Assumes familiarity with React 18+, TypeScript, and the Trackora backend documented in `docs/TRACKORA_GUIDE.md`.

---

## Table of Contents (Part 1)

1. [Executive Summary](#1-executive-summary)
2. [Architectural Principles](#2-architectural-principles)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [API Integration Layer](#5-api-integration-layer)
6. [State Management Strategy](#6-state-management-strategy)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Routing & Code Splitting](#8-routing--code-splitting)
9. [Design System & Component Architecture](#9-design-system--component-architecture)

---

## 1. Executive Summary

### 1.1 Goal

Build a **production-grade React SPA** that exposes every capability of the Trackora backend (task workflow, notifications, admin) to four user roles (ADMIN, MANAGER, CONTRIBUTOR, VIEWER) with enterprise non-functional requirements:

| NFR | Target |
|---|---|
| Time to Interactive (p75, mid-range laptop) | < 2.5 s |
| Largest Contentful Paint | < 2.0 s |
| JS bundle (initial route, gzipped) | < 180 KB |
| Lighthouse Performance score | ≥ 90 |
| Lighthouse Accessibility score | ≥ 95 (WCAG 2.1 AA) |
| Test coverage (statements) | ≥ 80 % |
| Zero critical Sentry errors in production | 48 h rolling |
| API typed coverage | 100 % (generated from OpenAPI) |

### 1.2 Non-Goals

- Server-Side Rendering. Trackora is an authenticated internal tool; SPA is simpler to deploy, and SEO is irrelevant behind auth.
- Mobile native apps. Responsive web covers tablet and mobile viewports.
- Offline-first. We support graceful degradation, not offline editing.

### 1.3 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Browser (React 18 SPA)                       │
│                                                                  │
│  ┌────────────┐   ┌───────────────┐   ┌────────────────────┐     │
│  │   Pages    │──▶│   Features    │──▶│   Shared / UI kit  │     │
│  │  (routes)  │   │  (modules)    │   │  (design system)   │     │
│  └────────────┘   └───────┬───────┘   └────────────────────┘     │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────┐       │
│  │  Server state: TanStack Query (cache, retry, refetch) │       │
│  │  Client state: Zustand (auth, UI prefs, drafts)       │       │
│  │  URL state:    React Router search params             │       │
│  │  Form state:   React Hook Form + Zod                  │       │
│  └───────────────────────────────────────────────────────┘       │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────┐       │
│  │  API client: axios + generated TS types + interceptors │      │
│  │  (JWT refresh, correlation-id, error normalization)    │      │
│  └───────────────────────────────────────────────────────┘       │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS + JWT Bearer
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Trackora Django API (api/v1/…)                     │
└──────────────────────────────────────────────────────────────────┘
```

### 1.4 Why These Choices (summary)

| Concern | Choice | Why this over alternatives |
|---|---|---|
| Framework | React 18 + Vite | Fast dev loop, tree-shaken builds, first-class TS, vast ecosystem |
| Language | TypeScript (strict) | Catches API contract drift at compile time |
| Server state | TanStack Query v5 | Battle-tested cache invalidation; optimistic updates; suspense support |
| Client state | Zustand | Minimal boilerplate vs Redux; no context re-render storms; ~3 KB |
| Routing | React Router v6 (data APIs) | Route loaders enable parallel data-fetch; built-in code splitting |
| Styling | Tailwind CSS + CSS variables | Utility-first speeds delivery; tokens enable theming |
| Components | shadcn/ui (Radix primitives) | Copy-owned components → zero vendor lock-in; a11y for free |
| Forms | React Hook Form + Zod | Uncontrolled inputs = perf; Zod mirrors backend validation |
| Tests | Vitest + RTL + Playwright + MSW | Fast unit, real DOM, real browser, real HTTP mocks |
| Observability | Sentry + web-vitals | Industry standard; open-source option (GlitchTip) if budget-sensitive |

---

## 2. Architectural Principles

These are the **non-negotiable** rules every feature must follow. Codify them in CODEOWNERS, ESLint rules, and PR review checklists.

### 2.1 Separation of Concerns (mirrors backend Clean Architecture)

The backend uses Clean Architecture with a pure `domain/` layer. The frontend uses an analogous **three-layer model**:

```
┌─────────────────────────────────────────────────────────┐
│  ROUTES (pages)        — composition, URL, layout       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  FEATURES          — business logic, hooks, UI    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  SHARED          — API client, UI kit,      │  │  │
│  │  │                    utils, types (pure)      │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Rule:** Outer imports inner. `shared` never imports from `features` or `pages`. Enforced by an ESLint `no-restricted-imports` rule.

### 2.2 Feature-Sliced Design (FSD)

Each feature is **self-contained**: its components, hooks, types, tests, and queries live in one folder. Features communicate only through public `index.ts` barrels.

```
features/
├── tasks/
│   ├── api/              # TanStack Query hooks
│   ├── components/       # feature-local components
│   ├── hooks/            # feature-local hooks
│   ├── schemas/          # Zod schemas
│   ├── types/            # TS types (re-exports from generated)
│   ├── utils/            # feature-local helpers
│   ├── __tests__/
│   └── index.ts          # public API — this is all other features can import
```

**Benefit:** deletable features. Remove a folder, remove a route, the rest compiles.

### 2.3 "Dumb UI, Smart Hooks"

Components are presentation only. All logic lives in custom hooks.

```tsx
// ✅ Good
function TaskList() {
  const { data, isLoading, error } = useTasks({ status: 'APPROVED' });
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  return <TaskTable tasks={data.results} />;
}

// ❌ Bad — fetching inside component
function TaskList() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { axios.get('/tasks').then(r => setTasks(r.data)); }, []);
  // ...
}
```

### 2.4 Type Everything, Trust Nothing

- Zero `any`. Use `unknown` + type guards.
- API types generated from the backend's `/api/schema/` (drf-spectacular). Never hand-write API DTOs.
- All external data (API responses, localStorage, URL params) validated with Zod **at the boundary**, typed freely after.

### 2.5 The Permission Matrix Is the Law

The backend enforces permissions in 3 layers. The frontend enforces a **4th layer for UX only** — hiding buttons the user can't use. Never rely on frontend checks for security.

```tsx
{can('task:approve', task) && <ApproveButton />}
```

### 2.6 Every Mutation Needs Three States

For every write operation, design: **idle / pending / success / error**, and optionally **optimistic**. Use TanStack Query's `useMutation` — never naked `fetch`.

### 2.7 Fail Loudly in Dev, Gracefully in Prod

- Dev: crash hard on unexpected state, surface every warning.
- Prod: error boundaries at route level, toast on mutation failure, Sentry on unexpected errors, user never sees a white screen.

### 2.8 Accessibility Is a Build Gate

- `eslint-plugin-jsx-a11y` warnings fail CI.
- Storybook has `@storybook/addon-a11y` running on every component.
- E2E tests include axe-core checks.

---

## 3. Technology Stack

Full stack with exact versions (as of the plan date). Pin major versions in `package.json`.

### 3.1 Runtime & Core

| Package | Version | Role |
|---|---|---|
| `react` | ^18.3 | UI library |
| `react-dom` | ^18.3 | DOM renderer |
| `typescript` | ^5.5 | Language |
| `vite` | ^5.4 | Dev server & bundler |
| `@vitejs/plugin-react-swc` | ^3.7 | SWC-based React plugin (faster than Babel) |

### 3.2 Routing & State

| Package | Version | Role |
|---|---|---|
| `react-router-dom` | ^6.26 | Routing with data APIs |
| `@tanstack/react-query` | ^5.51 | Server state |
| `@tanstack/react-query-devtools` | ^5.51 | Query inspector |
| `zustand` | ^4.5 | Client state |
| `immer` | ^10.1 | Immutable updates in Zustand |

### 3.3 API & Forms

| Package | Version | Role |
|---|---|---|
| `axios` | ^1.7 | HTTP client (interceptors!) |
| `openapi-typescript` | ^7.3 | Generate TS types from schema |
| `react-hook-form` | ^7.52 | Form state |
| `@hookform/resolvers` | ^3.9 | RHF × Zod bridge |
| `zod` | ^3.23 | Runtime validation |

### 3.4 UI & Styling

| Package | Version | Role |
|---|---|---|
| `tailwindcss` | ^3.4 | Utility CSS |
| `@radix-ui/*` | latest | Headless primitives (Dialog, Popover, etc.) |
| `class-variance-authority` | ^0.7 | Variant prop API for components |
| `tailwind-merge` | ^2.4 | Conflict-safe class merging |
| `lucide-react` | ^0.400 | Icon set |
| `sonner` | ^1.5 | Toasts |
| `cmdk` | ^1.0 | Command palette |
| `@tanstack/react-table` | ^8.20 | Headless data tables |
| `react-virtuoso` | ^4.9 | List virtualization |
| `@dnd-kit/core` + `@dnd-kit/sortable` | ^6.1 | Kanban DnD |
| `date-fns` | ^3.6 | Date utilities (tree-shakeable, unlike moment) |

### 3.5 Testing & Quality

| Package | Version | Role |
|---|---|---|
| `vitest` | ^2.0 | Test runner |
| `@testing-library/react` | ^16.0 | Component tests |
| `@testing-library/user-event` | ^14.5 | Realistic user interactions |
| `msw` | ^2.3 | Mock Service Worker (HTTP mocks) |
| `@playwright/test` | ^1.46 | E2E browser tests |
| `@axe-core/playwright` | ^4.9 | A11y in E2E |
| `eslint` | ^9.9 | Linter (flat config) |
| `typescript-eslint` | ^8.2 | TS rules |
| `eslint-plugin-react-hooks` | ^5.0 | Hook rules |
| `eslint-plugin-jsx-a11y` | ^6.10 | A11y rules |
| `prettier` | ^3.3 | Formatter |
| `husky` + `lint-staged` | latest | Git hooks |
| `@commitlint/cli` | ^19.4 | Conventional commits |

### 3.6 Observability

| Package | Version | Role |
|---|---|---|
| `@sentry/react` | ^8.26 | Error tracking + performance |
| `web-vitals` | ^4.2 | Core Web Vitals reporting |

### 3.7 Build Output & Deployment

- Static assets → served via Nginx / CloudFront / any CDN
- Base URL configured via `import.meta.env.VITE_API_BASE_URL`
- Content-hashed filenames for long cache
- Source maps uploaded to Sentry, removed from public output

---

## 4. Project Structure

```
trackora-web/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint + typecheck + test + build
│       ├── e2e.yml                   # Playwright on PR
│       └── preview.yml               # Vercel/Netlify preview deploys
├── .husky/
│   ├── pre-commit                    # lint-staged
│   └── commit-msg                    # commitlint
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── public/
│   ├── favicon.svg
│   └── robots.txt                    # Disallow: / (internal app)
├── src/
│   ├── app/                          # application shell
│   │   ├── App.tsx
│   │   ├── Providers.tsx             # query, router, theme, toast, error boundary
│   │   ├── router.tsx                # route tree
│   │   └── root-error.tsx
│   ├── pages/                        # route components (1 file per URL)
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── dashboard/
│   │   │   └── index.tsx
│   │   ├── tasks/
│   │   │   ├── index.tsx             # /tasks (list + kanban tabs)
│   │   │   ├── [id].tsx              # /tasks/:id (detail)
│   │   │   └── new.tsx
│   │   ├── notifications/
│   │   │   └── index.tsx
│   │   ├── admin/
│   │   │   ├── users.tsx
│   │   │   └── roles.tsx
│   │   ├── settings/
│   │   │   └── notifications.tsx
│   │   └── not-found.tsx
│   ├── features/                     # ★ feature modules
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── workflow/                 # approve/reject/start/complete/close/assign
│   │   ├── comments/
│   │   ├── attachments/
│   │   ├── notifications/
│   │   ├── users/                    # admin user management
│   │   ├── roles/
│   │   └── dashboard/
│   ├── shared/                       # ★ shared building blocks
│   │   ├── api/
│   │   │   ├── client.ts             # axios instance + interceptors
│   │   │   ├── endpoints.ts          # path constants
│   │   │   ├── generated.ts          # openapi-typescript output (do not edit)
│   │   │   ├── error.ts              # normalized ApiError class
│   │   │   └── query-client.ts       # TanStack Query config
│   │   ├── auth/
│   │   │   ├── token-store.ts        # memory-only access token
│   │   │   ├── refresh-queue.ts      # dedupes concurrent refreshes
│   │   │   └── permissions.ts        # can() function + permission matrix
│   │   ├── ui/                       # design-system primitives (shadcn-owned)
│   │   │   ├── button/
│   │   │   ├── dialog/
│   │   │   ├── form/
│   │   │   ├── input/
│   │   │   ├── select/
│   │   │   ├── table/
│   │   │   ├── toast/
│   │   │   ├── tooltip/
│   │   │   ├── badge/
│   │   │   ├── skeleton/
│   │   │   └── index.ts
│   │   ├── components/               # reusable composite components
│   │   │   ├── app-shell/
│   │   │   ├── data-table/
│   │   │   ├── empty-state/
│   │   │   ├── error-boundary/
│   │   │   ├── loading-states/
│   │   │   ├── page-header/
│   │   │   └── pagination/
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-media-query.ts
│   │   │   ├── use-url-state.ts
│   │   │   └── use-stable-callback.ts
│   │   ├── lib/
│   │   │   ├── cn.ts                 # class-name merger
│   │   │   ├── date.ts               # formatters (relative, absolute)
│   │   │   ├── logger.ts             # thin wrapper (console in dev, Sentry in prod)
│   │   │   └── env.ts                # validated env (zod)
│   │   ├── types/
│   │   │   ├── api.ts                # re-exports from generated.ts
│   │   │   └── domain.ts             # frontend-only types
│   │   ├── config/
│   │   │   ├── constants.ts
│   │   │   └── feature-flags.ts
│   │   └── test/
│   │       ├── msw/                  # HTTP handlers
│   │       ├── fixtures/             # sample API payloads
│   │       └── render.tsx            # custom RTL render w/ providers
│   ├── styles/
│   │   ├── globals.css               # tailwind directives + CSS variables
│   │   └── tokens.css                # design tokens (colors, spacing)
│   ├── main.tsx                      # entry
│   └── vite-env.d.ts
├── tests/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── task-workflow.spec.ts
│       └── fixtures.ts
├── .env.example
├── .eslintrc.cjs                     # or eslint.config.js (flat)
├── .gitignore
├── .prettierrc
├── commitlint.config.cjs
├── index.html
├── package.json
├── playwright.config.ts
├── postcss.config.cjs
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

**Directory rules** (enforced via ESLint `no-restricted-imports`):

- `shared/*` can only import from `shared/*`
- `features/*` can import from `shared/*` and **own feature only**
- `features/a` **cannot** import from `features/b` — cross-feature communication goes through URL params, shared state, or lifting to a page
- `pages/*` can import from `features/*` and `shared/*`
- Nothing outside `shared/api/` may import `axios` directly

---

## 5. API Integration Layer

This is the single most leveraged piece of infrastructure. Get this right once and every feature is a thin layer on top.

### 5.1 Type Generation from OpenAPI

Trackora exposes its schema at `/api/schema/`. Generate TypeScript types on every backend change:

```json
// package.json
"scripts": {
  "api:types": "openapi-typescript http://localhost:8000/api/schema/ -o src/shared/api/generated.ts"
}
```

Run in CI as a drift guard — fail the build if generated types differ from committed types.

```ts
// src/shared/types/api.ts
import type { components, paths } from '@/shared/api/generated';

export type Task = components['schemas']['TaskDetail'];
export type TaskList = components['schemas']['TaskList'];
export type Comment = components['schemas']['Comment'];
export type Notification = components['schemas']['Notification'];
export type User = components['schemas']['User'];

// Error response shape from apps/core/exception_handler.py
export type ApiErrorPayload = {
  error: string;
  message: string;
  type: 'domain_error' | 'validation_error' | 'not_found' | 'unexpected_error';
  details?: Record<string, unknown>;
  correlation_id?: string;
};
```

### 5.2 Axios Client with Interceptors

```ts
// src/shared/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '@/shared/auth/token-store';
import { refreshQueue } from '@/shared/auth/refresh-queue';
import { ApiError } from './error';
import { env } from '@/shared/lib/env';

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,       // e.g. http://localhost:8000/api/v1
  timeout: 15_000,
  withCredentials: false,                // we use Bearer tokens, not cookies
});

// Request: attach JWT + correlation id
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Correlation-ID'] = crypto.randomUUID();
  return config;
});

// Response: normalize errors + trigger refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 → try refresh once, then retry
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newAccess = await refreshQueue.refresh();
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newAccess}`;
        }
        return api(original);
      } catch {
        // refresh failed — caller handles (redirect to login)
      }
    }

    throw ApiError.fromAxios(error);
  }
);
```

### 5.3 Normalized Error Class

The backend returns a specific error shape. Normalize it once; every consumer uses `ApiError`:

```ts
// src/shared/api/error.ts
import { AxiosError } from 'axios';
import type { ApiErrorPayload } from '@/shared/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;                 // e.g. 'InvalidWorkflowTransitionError'
  readonly type: ApiErrorPayload['type'] | 'network';
  readonly details?: Record<string, unknown>;
  readonly correlationId?: string;

  constructor(init: {
    status: number;
    code: string;
    type: ApiError['type'];
    message: string;
    details?: Record<string, unknown>;
    correlationId?: string;
  }) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.type = init.type;
    this.details = init.details;
    this.correlationId = init.correlationId;
  }

  static fromAxios(err: AxiosError<ApiErrorPayload>): ApiError {
    if (!err.response) {
      return new ApiError({
        status: 0,
        code: 'NetworkError',
        type: 'network',
        message: 'Network unavailable. Check your connection.',
      });
    }
    const data = err.response.data;
    return new ApiError({
      status: err.response.status,
      code: data?.error ?? 'UnknownError',
      type: data?.type ?? 'unexpected_error',
      message: data?.message ?? err.message,
      details: data?.details,
      correlationId: data?.correlation_id,
    });
  }

  // Convenience predicates used in components and mutations
  isConflict() { return this.status === 409; }
  isForbidden() { return this.status === 403; }
  isNotFound() { return this.status === 404; }
  isValidation() { return this.status === 400; }
}
```

**Why this matters:** Components don't `instanceof AxiosError` or dig into `err.response.data.error`. They do `err.isConflict()` or `err.code === 'InvalidWorkflowTransitionError'`. UI stays clean.

### 5.4 Endpoint Constants

Never sprinkle string paths. One place:

```ts
// src/shared/api/endpoints.ts
export const ep = {
  auth: {
    register: '/auth/register/',
    login:    '/auth/login/',
    refresh:  '/auth/refresh/',
    logout:   '/auth/logout/',
  },
  tasks: {
    list:    '/tasks/',
    detail:  (id: string) => `/tasks/${id}/`,
    stats:   '/tasks/stats/',
    history: (id: string) => `/tasks/${id}/history/`,
    // workflow actions
    submit:   (id: string) => `/tasks/${id}/submit_for_approval/`,
    approve:  (id: string) => `/tasks/${id}/approve/`,
    reject:   (id: string) => `/tasks/${id}/reject/`,
    assign:   (id: string) => `/tasks/${id}/assign/`,
    start:    (id: string) => `/tasks/${id}/start/`,
    complete: (id: string) => `/tasks/${id}/complete/`,
    close:    (id: string) => `/tasks/${id}/close/`,
  },
  comments:    '/comments/',
  attachments: '/attachments/',
  notifications: {
    list: '/notifications/',
    markRead: (id: string) => `/notifications/${id}/mark_read/`,
    markAllRead: '/notifications/mark_all_read/',
    preferences: '/notification-preferences/',
  },
  users: '/users/',
  roles: '/roles/',
  userRoles: '/user-roles/',
} as const;
```

### 5.5 TanStack Query Configuration

```ts
// src/shared/api/query-client.ts
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './error';
import { navigateToLogin } from '@/shared/auth/navigate';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) navigateToLogin();
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof ApiError) {
        // Surface the backend's message — it's user-readable by contract
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    },
  }),
});
```

### 5.6 Query Key Factory

A convention that makes cache invalidation trivial:

```ts
// src/features/tasks/api/keys.ts
export const taskKeys = {
  all:    ['tasks'] as const,
  lists:  () => [...taskKeys.all, 'list'] as const,
  list:   (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details:() => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  history:(id: string) => [...taskKeys.detail(id), 'history'] as const,
  stats:  () => [...taskKeys.all, 'stats'] as const,
};

// Invalidate every task list without touching details:
queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
```

---

## 6. State Management Strategy

> **The single biggest frontend architectural decision is "what kind of state goes where?"**. Get this right and 80 % of your bugs disappear.

### 6.1 The Four Kinds of State

| Kind | Examples in Trackora | Tool | Why |
|---|---|---|---|
| **Server state** | tasks list, notifications, user profile | TanStack Query | It's a cache of remote data, with invalidation, staleness, retries |
| **Client state (global)** | current user, theme, sidebar collapsed | Zustand | Persistent across routes, updated from anywhere |
| **URL state** | filters, page, sort, tab | React Router search params + `useUrlState` | Shareable, bookmarkable, survives reload |
| **Form state** | task create/edit form | React Hook Form | Ephemeral, validated, high-frequency updates |
| **Component state** | open/closed menus, hover | `useState` | Local lifecycle |

**Never cross the streams.** Don't put server data in Zustand; don't put filters in Zustand (use URL).

### 6.2 Server State with TanStack Query

Every API call is wrapped in a query or mutation hook. Features expose these hooks; components consume them.

```ts
// src/features/tasks/api/use-tasks.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { taskKeys } from './keys';
import type { Task, PaginatedResponse } from '@/shared/types/api';

export type TaskFilters = {
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
  ordering?: string;
  page?: number;
};

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Task>>(ep.tasks.list, { params: filters });
      return res.data;
    },
    placeholderData: keepPreviousData,    // smooth pagination
    staleTime: 30_000,
  });
}
```

```ts
// src/features/workflow/api/use-approve-task.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { taskKeys } from '@/features/tasks/api/keys';
import type { Task } from '@/shared/types/api';

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; reason?: string }) => {
      const { data } = await api.post<Task>(ep.tasks.approve(vars.id), {
        reason: vars.reason ?? '',
      });
      return data;
    },
    onMutate: async (vars) => {
      // Optimistic update — flip status immediately
      await qc.cancelQueries({ queryKey: taskKeys.detail(vars.id) });
      const prev = qc.getQueryData<Task>(taskKeys.detail(vars.id));
      if (prev) {
        qc.setQueryData<Task>(taskKeys.detail(vars.id), { ...prev, status: 'APPROVED' });
      }
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      // Roll back
      if (ctx?.prev) qc.setQueryData(taskKeys.detail(vars.id), ctx.prev);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.history(vars.id) });
      qc.invalidateQueries({ queryKey: taskKeys.stats() });
    },
  });
}
```

### 6.3 Client State with Zustand

Only for state that is truly global and doesn't belong in a URL or on the server.

```ts
// src/features/auth/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/shared/types/api';

type AuthState = {
  user: User | null;
  roles: string[];
  setSession: (user: User, roles: string[]) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      roles: [],
      setSession: (user, roles) => set({ user, roles }),
      clear: () => set({ user: null, roles: [] }),
    }),
    {
      name: 'trackora.auth',
      // Never persist tokens here! Tokens live in memory only.
      partialize: (s) => ({ user: s.user, roles: s.roles }),
    }
  )
);

// Selectors — consume only what you need to avoid re-renders
export const useUser = () => useAuthStore((s) => s.user);
export const useRoles = () => useAuthStore((s) => s.roles);
```

**Zustand rules:**
- One store per feature (auth, theme, ui-prefs)
- Expose selector hooks, not the raw store
- Never put server data here — it'll go stale

### 6.4 URL State

Filters, pagination, and the active tab belong in the URL. They're free bookmarking + sharing.

```ts
// src/shared/hooks/use-url-state.ts
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

export function useUrlState<T extends z.ZodType>(schema: T, defaults: z.infer<T>) {
  const [params, setParams] = useSearchParams();

  const value = useMemo(() => {
    const raw = Object.fromEntries(params.entries());
    const parsed = schema.safeParse({ ...defaults, ...raw });
    return parsed.success ? parsed.data : defaults;
  }, [params, schema, defaults]);

  const setValue = useCallback((next: Partial<z.infer<T>>) => {
    setParams((prev) => {
      const merged = { ...Object.fromEntries(prev), ...next };
      // Remove empty values to keep URLs clean
      Object.entries(merged).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) delete (merged as any)[k];
      });
      return merged as any;
    });
  }, [setParams]);

  return [value, setValue] as const;
}
```

```tsx
// usage
const filterSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().default(1),
  search: z.string().default(''),
});

const [filters, setFilters] = useUrlState(filterSchema, { page: 1, search: '' });
const { data } = useTasks(filters);
```

### 6.5 Form State

Always React Hook Form. Never controlled components for forms. Validation through Zod — same library as your URL validation.

```tsx
// src/features/tasks/schemas/task-form.ts
import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(10, 'At least 10 characters').max(150, 'Max 150 characters'),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  due_date: z.coerce.date().refine((d) => d > new Date(), 'Must be in the future'),
  sla_hours: z.coerce.number().int().min(1, 'At least 1 hour'),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
```

**Critical:** These Zod rules mirror `apps/tasks/api/serializers.py` exactly. If backend rules change, update here. Consider sharing schema definitions via a shared npm package if you have a monorepo.

---

## 7. Authentication & Authorization

### 7.1 Token Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│ 1. Login                                                   │
│    POST /auth/login { email, password }                    │
│    → { access, refresh }                                   │
│    - access  → memory (tokenStore)                         │
│    - refresh → httpOnly cookie (set by backend) OR         │
│                sessionStorage (we use this)                │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Each request                                            │
│    Authorization: Bearer <access>                          │
│    If 401 → refresh flow                                   │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Refresh (single-flight — concurrent 401s share one)     │
│    POST /auth/refresh { refresh }                          │
│    → { access, refresh }                                   │
│    - Old refresh blacklisted by backend                    │
│    - Store new access in memory                            │
│    - Replay original failed requests                       │
└────────────────┬───────────────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────────────┐
│ 4. Logout                                                  │
│    POST /auth/logout { refresh }                           │
│    Clear tokenStore, clear auth-store, navigate to /login  │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Token Storage — The Security Debate

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| localStorage | Survives reload | XSS-readable — any injected script steals tokens | ❌ No |
| sessionStorage | Per-tab isolation | Still XSS-readable | ⚠️ Refresh only |
| In-memory (JS variable) | XSS-proof | Lost on reload | ✅ Access token |
| httpOnly cookie | XSS-proof, survives reload | CSRF risk (needs CSRF token), cross-domain complexity | ✅ Best if backend supports |

**Our choice:**
- **Access token → in-memory** (lost on reload; page refresh silently re-fetches via refresh token)
- **Refresh token → sessionStorage** (per-tab; cleared on logout or tab close)
- **Long-term roadmap:** move refresh to httpOnly cookie (requires a backend change to set cookies on login and accept them on refresh endpoint)

```ts
// src/shared/auth/token-store.ts
let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => { accessToken = t; },
  clear: () => { accessToken = null; },
};

export const refreshStore = {
  get: () => sessionStorage.getItem('trackora.refresh'),
  set: (t: string) => sessionStorage.setItem('trackora.refresh', t),
  clear: () => sessionStorage.removeItem('trackora.refresh'),
};
```

### 7.3 Single-Flight Refresh Queue

Without this, 10 parallel API calls that 401 → 10 refresh calls → backend blacklist storm.

```ts
// src/shared/auth/refresh-queue.ts
import axios from 'axios';
import { env } from '@/shared/lib/env';
import { tokenStore, refreshStore } from './token-store';

let inflight: Promise<string> | null = null;

export const refreshQueue = {
  async refresh(): Promise<string> {
    if (inflight) return inflight;
    inflight = (async () => {
      const refresh = refreshStore.get();
      if (!refresh) throw new Error('No refresh token');
      try {
        const { data } = await axios.post<{ access: string; refresh: string }>(
          `${env.VITE_API_BASE_URL}/auth/refresh/`,
          { refresh }
        );
        tokenStore.set(data.access);
        refreshStore.set(data.refresh);
        return data.access;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },
};
```

### 7.4 RBAC — Permissions Matrix

Mirror the backend's role capabilities. Cache as a single declarative object:

```ts
// src/shared/auth/permissions.ts
import type { Task } from '@/shared/types/api';
import { useRoles, useUser } from '@/features/auth/store';

export type Role = 'ADMIN' | 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
export type Action =
  | 'task:create'
  | 'task:view'
  | 'task:edit'
  | 'task:delete'
  | 'task:submit'
  | 'task:approve'
  | 'task:reject'
  | 'task:assign'
  | 'task:start'
  | 'task:complete'
  | 'task:close'
  | 'task:view-history'
  | 'comment:create'
  | 'comment:create-internal'
  | 'attachment:upload'
  | 'user:manage'
  | 'role:manage';

// Role-only checks
const roleMatrix: Record<Action, Role[]> = {
  'task:create':            ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:view':              ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
  'task:edit':              ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:delete':            ['ADMIN'],
  'task:submit':            ['ADMIN', 'MANAGER'],
  'task:approve':           ['ADMIN', 'MANAGER'],
  'task:reject':            ['ADMIN', 'MANAGER'],
  'task:assign':            ['ADMIN', 'MANAGER'],
  'task:start':             ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:complete':          ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'task:close':             ['ADMIN', 'MANAGER'],
  'task:view-history':      ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'],
  'comment:create':         ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'comment:create-internal':['ADMIN', 'MANAGER'],
  'attachment:upload':      ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
  'user:manage':            ['ADMIN'],
  'role:manage':            ['ADMIN'],
};

export function useCan() {
  const roles = useRoles() as Role[];
  const user = useUser();

  return (action: Action, resource?: Task): boolean => {
    // Step 1: role check
    const allowedRoles = roleMatrix[action];
    if (!allowedRoles.some((r) => roles.includes(r))) return false;

    // Step 2: resource-specific checks (e.g. "only assignee can start")
    if (!resource || !user) return true;

    const isElevated = roles.includes('ADMIN') || roles.includes('MANAGER');
    switch (action) {
      case 'task:view':
      case 'task:edit':
        return isElevated || resource.created_by === user.id || resource.assigned_to === user.id;
      case 'task:start':
        return isElevated || resource.assigned_to === user.id;
      default:
        return true;
    }
  };
}
```

**Usage:**

```tsx
function ApproveButton({ task }: { task: Task }) {
  const can = useCan();
  if (!can('task:approve', task)) return null;
  if (task.status !== 'PENDING_APPROVAL') return null;
  return <Button onClick={...}>Approve</Button>;
}
```

### 7.5 Route Guards

Composable protected routes:

```tsx
// src/app/guards.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser, useRoles } from '@/features/auth/store';
import type { Role } from '@/shared/auth/permissions';

export function RequireAuth() {
  const user = useUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function RequireRole({ allow }: { allow: Role[] }) {
  const roles = useRoles() as Role[];
  if (!roles.some((r) => allow.includes(r))) return <Navigate to="/403" replace />;
  return <Outlet />;
}
```

---

## 8. Routing & Code Splitting

### 8.1 Route Tree

```tsx
// src/app/router.tsx
import { createBrowserRouter, lazy } from 'react-router-dom';
import { RootLayout } from '@/shared/components/app-shell';
import { RequireAuth, RequireRole } from './guards';

const LoginPage           = lazy(() => import('@/pages/auth/login'));
const DashboardPage       = lazy(() => import('@/pages/dashboard'));
const TasksPage           = lazy(() => import('@/pages/tasks'));
const TaskDetailPage      = lazy(() => import('@/pages/tasks/[id]'));
const NewTaskPage         = lazy(() => import('@/pages/tasks/new'));
const NotificationsPage   = lazy(() => import('@/pages/notifications'));
const AdminUsersPage      = lazy(() => import('@/pages/admin/users'));
const AdminRolesPage      = lazy(() => import('@/pages/admin/roles'));
const SettingsPage        = lazy(() => import('@/pages/settings/notifications'));
const NotFoundPage        = lazy(() => import('@/pages/not-found'));

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RootLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true,                 element: <DashboardPage /> },
          { path: 'tasks',               element: <TasksPage /> },
          { path: 'tasks/new',           element: <NewTaskPage /> },
          { path: 'tasks/:id',           element: <TaskDetailPage /> },
          { path: 'notifications',       element: <NotificationsPage /> },
          { path: 'settings',            element: <SettingsPage /> },
          {
            path: 'admin',
            element: <RequireRole allow={['ADMIN']} />,
            children: [
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'roles', element: <AdminRolesPage /> },
            ],
          },
          { path: '403',   element: <ForbiddenPage /> },
          { path: '*',     element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
```

### 8.2 Code Splitting Targets

- **Per-route splitting** — every `pages/*` is `React.lazy`'d. Initial bundle stays small.
- **Per-feature splitting** — heavy feature sub-components (Kanban, File Preview, Charts) lazy-loaded within their route.
- **Library splitting** — Vite's manual chunks for `react`, `react-router`, `@tanstack/react-query` so they cache long-term.

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor':    ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
        },
      },
    },
    chunkSizeWarningLimit: 500,   // 500 KB — fail build if a chunk exceeds
  },
});
```

### 8.3 Prefetching

- **On hover:** Link prefetch for the task-detail page when hovering a row
- **On visible:** Intersection observer prefetch for next page of task list
- **On route match:** Prefetch deps of the most-used secondary route

```tsx
// Prefetch task detail on row hover
function TaskRow({ task }: { task: Task }) {
  const qc = useQueryClient();
  const prefetch = () => {
    qc.prefetchQuery({
      queryKey: taskKeys.detail(task.id),
      queryFn: () => api.get<Task>(ep.tasks.detail(task.id)).then((r) => r.data),
    });
  };
  return <Link to={`/tasks/${task.id}`} onMouseEnter={prefetch}>{task.title}</Link>;
}
```

---

## 9. Design System & Component Architecture

### 9.1 Atomic Design, Pragmatic Version

```
Atoms       → shared/ui/*          (Button, Input, Badge — shadcn-owned)
Molecules   → shared/components/*  (DataTable, EmptyState, PageHeader)
Organisms   → features/*/components (TaskTable, TaskForm, KanbanBoard)
Templates   → shared/components/app-shell (RootLayout, SidebarLayout)
Pages       → pages/*
```

### 9.2 Design Tokens

CSS variables drive everything. Tailwind consumes them. Dark mode is a class toggle.

```css
/* src/styles/tokens.css */
:root {
  --color-bg:         220 20% 98%;
  --color-fg:         220 20% 10%;
  --color-primary:    220 90% 56%;
  --color-danger:     0   84% 60%;
  --color-warning:    38  92% 50%;
  --color-success:    142 71% 45%;
  --color-border:     220 13% 91%;
  --radius:           0.5rem;
  --spacing-unit:     0.25rem;
  --font-sans:        'Inter', system-ui, sans-serif;
}
.dark {
  --color-bg:         220 20% 10%;
  --color-fg:         220 20% 98%;
  /* ... */
}
```

### 9.3 Component Variants with CVA

Every reusable component has explicit variants, sizes, and states via `class-variance-authority`:

```tsx
// src/shared/ui/button/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & {
  loading?: boolean;
};

export function Button({ className, variant, size, loading, disabled, children, ...rest }: Props) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {children}
    </button>
  );
}
```

### 9.4 Accessibility Baseline

- All interactive elements reachable by keyboard
- Visible focus outlines (never `outline: none` without a replacement)
- Labels on every form input (`<label htmlFor>` or `aria-label`)
- Color contrast ≥ 4.5:1 (tokens chosen to meet this)
- Modals trap focus + restore on close (Radix gives this free)
- Live regions for async updates (toast, table updates)
- Prefers-reduced-motion respected for animations

### 9.5 Theming

Two themes shipped (light/dark); theme stored in Zustand, persisted, applied via `<html class="dark">`. Users can override via Settings page; default follows `prefers-color-scheme`.

---

**End of Part 1.** Continue with:
- `02_features.md` — Feature modules, forms, realtime, performance
- `03_quality.md` — Testing, security, observability, a11y, DevEx
- `04_roadmap.md` — CI/CD, phased delivery, Definition of Done
