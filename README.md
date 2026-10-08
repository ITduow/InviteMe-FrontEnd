# InviteMe frontend

Frontend foundation for a five-person capstone team. Next.js App Router, React, strict TypeScript, Tailwind CSS, and shadcn/ui conventions. The ASP.NET Core API, PostgreSQL, and SignalR hub are separate applications. There are no Next.js API routes or backend business rules here.

**Scope:** route scaffolds, layouts, providers, session/permission infrastructure, typed HTTP, realtime lifecycle, reusable UI, and one read-only weddings example. Wedding creation, guest import, invitations, RSVP, seating, check-in, gifts, and other business workflows are intentionally not implemented. Login is a minimal integration example and requires a compatible backend; registration/recovery are placeholders.

## Run locally

Node.js 22.15+ and npm are required. Commit `package-lock.json`; use `npm ci` for reproducible installs.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: `Copy-Item .env.example .env.local`. Open [localhost:3000](http://localhost:3000). On machines with a broken global npm shim, invoke the npm bundled with Node, e.g. `& 'C:\Program Files\nodejs\npm.cmd' run dev`.

```sh
npm run lint          # Next/React rules and architecture boundaries
npm run typecheck     # Strict TypeScript
npm test              # Node test runner via tsx; HTTP/session regression checks
npm run format:check
npm run format
npm run build
npm start
```

No environment values are required to render the public scaffold. Missing API configuration disables sign-in; missing SignalR configuration disables live updates. Invalid supplied URLs fail validation. Public configuration is compiled into the browser bundle; rebuild after changing it in production.

## Environment

| Variable                           | Purpose                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`              | ASP.NET API base including `/api`; example `http://localhost:5000/api`                          |
| `NEXT_PUBLIC_SIGNALR_URL`          | Full hub endpoint; example `http://localhost:5000/hubs/wedding`                                 |
| `NEXT_PUBLIC_APP_URL`              | Frontend origin reserved for future absolute invitation links                                   |
| `NEXT_PUBLIC_AUTH_REFRESH_ENABLED` | `false` by default; enable only after agreeing cookie refresh, logout, and CSRF/origin controls |

These are public values, never JWT signing keys, database credentials, provider keys, or secrets. `.env.local` is ignored. Use HTTPS in deployment.

## Architecture and directory tree

The complete tracked-source tree is in [docs/directory-tree.txt](docs/directory-tree.txt). Public marketing homepage content and section order are in [docs/public-landing-page-spec.md](docs/public-landing-page-spec.md). Detailed design and module ownership are in [docs/architecture.md](docs/architecture.md). Proposed backend contracts are in [docs/backend-contract.md](docs/backend-contract.md).

```text
src/
  app/              Route groups, thin pages, layouts, error/loading boundaries, providers
  features/
    auth/           Login, session bootstrap, current-user query, route/access guards
    weddings/       Typed, paginated, read-only example and wedding realtime integration
  shared/
    ui/             Locally owned shadcn/ui primitives
    layout/         Public, dashboard, and wedding navigation
    components/     PageHeader, DataTable, Pagination, SearchInput, StatusBadge, PermissionGuard
    feedback/       EmptyState, LoadingState, ErrorState, ConfirmDialog, placeholders
    forms/          RHF field wrapper and safe API error mapping
    stores/         Sidebar state only
    lib/            Class-name utility
  core/
    api/            Fetch client, response/error contracts
    auth/           Token session, platform roles, wedding permission types
    config/         Environment and browser runtime context
    query/          QueryClient defaults
    realtime/       Shared SignalR connection and event contracts
tests/              HTTP, session, and realtime lifecycle regressions
docs/               Architecture, complete tree, integration contract
```

Dependencies flow **app → features → shared → core**. A layer can use any layer below it. ESLint resolves both aliases and relative imports, prohibits upward imports, prohibits cross-feature imports, and requires external consumers to use a feature's `index.ts`. Compose related features at route level; coordinate through backend events/query invalidation rather than importing internals. No empty feature directories are created in anticipation of future work.

## Route map

| Group            | URLs                                                                                                                                                                   | Access                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Public           | `/`, `/pricing`, `/wedding/[slug]`                                                                                                                                     | Anonymous                                  |
| Auth             | `/login`, `/register`, `/forgot-password`                                                                                                                              | Anonymous                                  |
| Host             | `/dashboard`, `/weddings`, `/weddings/new`                                                                                                                             | Authenticated account                      |
| Wedding          | `/weddings/[weddingId]` → `overview`                                                                                                                                   | Backend wedding membership                 |
| Wedding sections | `overview`, `website`, `guests`, `invitations`, `rsvp`, `waitlist`, `seating`, `check-in`, `gifts`, `analytics`, `settings`, `co-hosts` under `/weddings/[weddingId]/` | Central wedding permission checks          |
| Guest            | `/invite/[token]`, `/invite/[token]/rsvp`                                                                                                                              | Secure invitation token; no normal account |
| Admin            | `/admin` → `/admin/dashboard`; `/admin/users`, `/admin/templates`, `/admin/plans`, `/admin/audit-logs`                                                                 | `ADMIN`                                    |

Route group names never appear in URLs. Guest pages have separate mobile-first styling, `noindex`, and a no-referrer policy. Invitations are scaffolds: they do not validate tokens or display personalized data yet. Do not add analytics that records token-bearing URLs. Add log redaction at deployment infrastructure too.

## State, API, auth, realtime

- **TanStack Query:** all server state, including current user and wedding permissions. Factories include wedding IDs and all list filters. Queries receive AbortSignal. Mutations must deliberately invalidate/update affected keys; no automatic mutation retries.
- **Zustand:** client UI only. The working example controls mobile sidebar expansion. Keep ephemeral component state local; future seating selection and wizard drafts may use feature-local stores. Never mirror server collections in Zustand.
- **HTTP:** feature API files use the injected central client. Relative endpoints only, base URL from environment, Zod response parsing, JWT injection for protected requests, one recovery/retry on 401, normalized errors, and cancellation. Public invitation calls must explicitly use `auth: "none"`; cookies are omitted unless an auth endpoint explicitly requests them. Error title/detail/stack text is never displayed.
- **Session:** access JWT in memory, no localStorage. Optional refresh uses the backend's HttpOnly cookie. Refresh calls are shared, late responses cannot restore a logged-out session, and account changes clear query caches and stop realtime. Without backend refresh, reload/expiry requires signing in again. User profile comes from `/auth/me`, never unverified JWT role claims.
- **Authorization:** platform roles are `USER` and `ADMIN`. Host and co-host are wedding relationships, not new platform roles. There is no reception-staff role or AI user role. `PermissionGuard` and `usePermission()` read backend membership permissions; no implicit administrator bypass. Client checks are UX only; every API and hub method must authorize independently.
- **Realtime:** one connection per runtime, active only within an authorized wedding workspace. Features subscribe without constructing connections. Switching weddings/logout stops the previous connection. Initial failures and exhausted reconnect attempts retry; reconnect rejoins the wedding and triggers refetch. Events carry wedding ID/version and are runtime validated. Pending/stale data must be reconciled through backend queries.

## UI and conventions

Neutral ivory, sage, and charcoal tokens; responsive dashboard, mobile-first invitation shell. Shared accessibility includes a skip link, labeled search/forms, error/status roles, semantic tables, visible focus, and Radix confirmation focus management. No external fonts or images are required to build.

`components.json` configures the shadcn registry and aliases. Button, Input, and Label are locally owned primitives following the shadcn/Radix composition pattern; ConfirmDialog wraps Radix AlertDialog. Add further primitives with `npx shadcn@latest add <component>`, review generated imports, and keep them in `shared/ui`. The only extra runtime libraries are shadcn's normal styling/accessibility dependencies. `tsx` is a development-only adapter for TypeScript tests with Node's built-in runner.

Use kebab-case filenames, PascalCase React components, camelCase functions, and uppercase global constants. Important forms use RHF + Zod; `LoginForm` demonstrates this. All API response schemas/types live with their owning feature. Avoid `any`, suppression comments, non-null assertions, circular imports, and business logic in pages. See architecture documentation for server/client boundaries and the five-person workflow.

## Installed dependencies

Exact resolved versions are in `package-lock.json` (`npm ls --depth=0`). Initial verified major versions: Next 16, React 19, Tailwind 4, TypeScript 5, TanStack Query 5, Zustand 5, Zod 4, RHF 7, SignalR 10.

| Category                                           | Packages                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                                          | `next`, `react`, `react-dom`                                                                                                                                                        |
| Server/UI state                                    | `@tanstack/react-query`, `zustand`                                                                                                                                                  |
| Forms                                              | `react-hook-form`, `@hookform/resolvers`, `zod`                                                                                                                                     |
| Realtime                                           | `@microsoft/signalr`                                                                                                                                                                |
| Drag/drop, reserved for seating/timeline milestone | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`                                                                                                                          |
| Presentation                                       | `lucide-react`, `date-fns`                                                                                                                                                          |
| shadcn primitives/style utilities                  | `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-alert-dialog`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`                             |
| Development                                        | `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `eslint-config-prettier`, `prettier`, `tsx` |

## Next milestone

Agree and integrate the ASP.NET auth/user/membership contracts, then implement wedding creation, list/detail/edit, and owner/co-host authorization as one vertical slice. Include real API integration tests, expired-session cases, and permission-denial cases. Follow with website/guests/import/invitation/RSVP; seating with backend concurrency comes after the participant and capacity contracts are stable. Do not enable refresh or advertise live collaboration until its backend contract is verified.
