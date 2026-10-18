# InviteMe frontend

Frontend foundation for a five-person capstone team. Next.js App Router, React, strict TypeScript, Tailwind CSS, and shadcn/ui conventions. The ASP.NET Core API, PostgreSQL, and SignalR hub are separate applications; business rules stay in the backend. The only Next.js API route is a development-only template asset helper.

**Scope:** shared app foundations plus working account, wedding list/setup, guest import/planning, seating, invitation design, and tokenized guest invitation slices. These connect to the separate ASP.NET Core API. RSVP submission, invitation review/publish, check-in, gifts, analytics and most admin workflows remain incomplete; route placeholders do not imply those workflows are available.

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
npm test              # Node test runner via tsx; HTTP/registration regression checks
npm run format:check
npm run format
npm run build
npm start
```

The public pages can render without backend configuration. Missing API configuration disables data-backed account, wedding and invitation flows. Missing SignalR configuration disables live updates. Invalid supplied URLs fail validation. Public configuration is compiled into the browser bundle; rebuild after changing it in production.

## Environment

| Variable                  | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | ASP.NET API base including `/api`; local API example `https://localhost:7043/api` |
| `NEXT_PUBLIC_SIGNALR_URL` | Full hub endpoint; local API example `https://localhost:7043/hubs/weddings`       |
| `NEXT_PUBLIC_APP_URL`     | Frontend origin reserved for future absolute invitation links                     |

These are public values, never JWT signing keys, database credentials, provider keys, or secrets. `.env.local` is ignored. Use HTTPS in deployment.

## Architecture and directory tree

The complete tracked-source tree is in [docs/directory-tree.txt](docs/directory-tree.txt). Public marketing homepage content and section order are in [docs/public-landing-page-spec.md](docs/public-landing-page-spec.md). Detailed design and module ownership are in [docs/architecture.md](docs/architecture.md). Proposed backend contracts are in [docs/backend-contract.md](docs/backend-contract.md).

```text
src/
  app/              Route groups, thin pages, layouts, error/loading boundaries, providers
  features/
    auth/           Register, confirm/resend email, email/Google login, session and route guards
    weddings/       Wedding list, setup form, slug availability, cover media and wedding realtime integration
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
    auth/           Platform roles and wedding permission types
    config/         Environment and browser runtime context
    query/          QueryClient defaults
    realtime/       Shared SignalR connection and event contracts
tests/              HTTP, registration, and feature regressions
docs/               Architecture, complete tree, integration contract
```

Dependencies flow **app → features → shared → core**. A layer can use any layer below it. ESLint resolves both aliases and relative imports, prohibits upward imports, prohibits cross-feature imports, and requires external consumers to use a feature's `index.ts`. Compose related features at route level; coordinate through backend events/query invalidation rather than importing internals. No empty feature directories are created in anticipation of future work.

## Route map

| Group            | URLs                                                                                                                                                                   | Access                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Public           | `/`, `/pricing`, `/wedding/[slug]`                                                                                                                                     | Anonymous                                  |
| Auth             | `/login`, `/register`, `/confirm-email`, `/forgot-password`                                                                                                            | Anonymous                                  |
| Host             | `/dashboard`, `/weddings`, `/weddings/new`                                                                                                                             | Authenticated account                      |
| Wedding          | `/weddings/[weddingId]` → `overview`                                                                                                                                   | Backend wedding membership                 |
| Wedding sections | `overview`, `website`, `guests`, `invitations`, `rsvp`, `waitlist`, `seating`, `check-in`, `gifts`, `analytics`, `settings`, `co-hosts` under `/weddings/[weddingId]/` | Central wedding permission checks          |
| Guest            | `/invite/[token]`, `/invite/[token]/rsvp`                                                                                                                              | Secure invitation token; no normal account |
| Admin            | `/admin` → `/admin/dashboard`; `/admin/users`, `/admin/templates`, `/admin/plans`, `/admin/audit-logs`                                                                 | `ADMIN`                                    |

Route group names never appear in URLs. Guest pages have separate mobile-first styling, `noindex`, and a no-referrer policy. `/weddings/new` creates a workspace; `/weddings/[weddingId]/overview` reads setup; `/weddings/[weddingId]/settings` edits it. `/invite/[token]` loads the personalized invitation from the API without a normal guest account. The guest RSVP route is still a placeholder. Do not add analytics that records token-bearing URLs. Add log redaction at deployment infrastructure too.

## Wedding Setup

The existing `/weddings` page remains the single paginated wedding list and links into setup. `GET /weddings` returns `{ items, page, pageSize, totalCount, totalPages }`; list rows contain `id`, `title`, `weddingDate`, `participantCount`, `maxCapacity` and `version`. The backend currently serializes a database `NULL` capacity as `maxCapacity: 0`; the UI displays that as `Chưa thiết lập`, and does not infer a default capacity. List search is case-insensitive over title/slug; supported sorts are `weddingDate`, `title` and `createdAt` (the current screen uses `weddingDate`). The create and edit form uses the `weddings` feature API, TanStack Query cache keys and Zod/RHF validation. Its fields are wedding name, unique slug, event date/time, RSVP deadline, venue, capacity and cover image. Dates are sent with the wedding's IANA timezone (default `Asia/Ho_Chi_Minh`) as an explicit offset.

Configure `NEXT_PUBLIC_API_URL` to the backend origin ending in `/api`. Wedding setup calls `POST /weddings`, `GET/PUT /weddings/{id}` and `GET /weddings/check-slug`. Slug checks are debounced by 500 ms and use a cancellable query; the backend still enforces uniqueness when the wedding is saved. The URL shown in the form is a preview only; it does not mean the public wedding site has been published.

Cover images are selected from the device and sent as `multipart/form-data` to `/weddings/{id}/cover-image` (JPEG, PNG or WebP, maximum 5 MiB). On create, the FE first creates the wedding, then uploads with the returned version. If upload fails, it retains the new wedding ID and lets the user retry without creating another wedding. Replacing/removing cover media and setup edits use the latest backend `version`; a `409` shows a reload action instead of retrying a stale write. The Wedding Access response has no `isOwner` flag. The FE uses `WEDDING_EDIT` only to shape the UI; owner-only writes may still be rejected with `403`, and the API remains authoritative for authorization and concurrency.

Use `npm run dev` with the backend running, then sign in and open `/weddings`. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` for local verification.

## State, API, auth, realtime

- **TanStack Query:** all server state, including current user and wedding permissions. Factories include wedding IDs and all list filters. Queries receive AbortSignal. Mutations must deliberately invalidate/update affected keys; no automatic mutation retries.
- **Zustand:** client UI only. The working example controls mobile sidebar expansion. Keep ephemeral component state local; future seating selection and wizard drafts may use feature-local stores. Never mirror server collections in Zustand.
- **HTTP:** feature API files use the injected central client. Relative endpoints only, base URL from environment, Zod response parsing, JWT injection for protected requests, one recovery/retry on 401, normalized errors, and cancellation. Public invitation calls must explicitly use `auth: "none"`; cookies are omitted unless an auth endpoint explicitly requests them. Error title/detail/stack text is never displayed.
- **Session:** the existing account feature handles login, refresh, logout and the current account. Registration requires email confirmation before the backend allows password login.
- **Authorization:** platform roles are `USER` and `ADMIN`. Host and co-host are wedding relationships, not new platform roles. There is no reception-staff role or AI user role. `PermissionGuard` and `usePermission()` use the wedding access API and default to no permissions. Client checks are UX only; every API and hub method must authorize independently. Wedding setup updates and cover management are owner-only on the backend.
- **Realtime:** currently disabled while login/session is rebuilt. The reusable connection client remains available for future authorized wedding workspaces. Features subscribe without constructing connections. Switching weddings/logout stops the previous connection. Initial failures and exhausted reconnect attempts retry; reconnect rejoins the wedding and triggers refetch. Events carry wedding ID/version and are runtime validated. Pending/stale data must be reconciled through backend queries.

## UI and conventions

Soft pink and cream tokens; responsive dashboard, mobile-first invitation shell. Body text uses Be Vietnam Pro and display headings use Noto Serif. Shared accessibility includes a skip link, labeled search/forms, error/status roles, semantic tables, visible focus, and Radix confirmation focus management.

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

Complete the published wedding website and invitation review/send lifecycle, then connect guest RSVP and the backend capacity/waitlist results. After that, implement mobile check-in and gifts/wishes. Keep AI output suggestion-only and wait for the matching backend contracts before exposing those workflows.

## Registration integration

Set `NEXT_PUBLIC_API_URL` to the BE base URL including `/api`. Backend `Frontend__Url` must match the browser origin for CORS and email links. SMTP must be configured on BE for delivery; a successful register response does not guarantee mail delivery.

`/register` posts only displayName/email/password and shows an email-confirmation notice; it does not sign in. `/confirm-email?email=...&code=...` asks the user to confirm before posting the token (avoids triggering confirmation on link preview). A successful confirmation clears query parameters. Resending has a 60-second UI cooldown, and only the newest email link remains valid. No password/token is persisted by this flow. Email/Google login, session refresh and wedding-access checks use the existing backend contract; backend authorization remains authoritative.
