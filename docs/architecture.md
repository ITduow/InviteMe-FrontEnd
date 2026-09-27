# Architecture decisions and team guide

## Boundaries

`app` owns URL composition, layouts, metadata, and providers. It imports public feature entry points and reusable UI. `features` owns business API calls, schemas, query factories, hooks, and containers. `shared` owns reusable presentation, form glue, and UI state. `core` owns infrastructure that knows nothing about features. Do not put business navigation rules into the transport or domain DTOs into shared UI.

The sample keeps globals together under `shared` instead of unrelated root components/hooks/stores/lib directories. This makes the dependency direction visible and avoids multiple plausible homes for new code. This is a new repository: no migration is necessary. New business modules are documented below rather than represented by empty directory trees.

Feature-to-feature imports are initially disallowed, even through barrels, to keep ownership simple for five developers. Compose at `app` boundaries. If a real need arises, record a small architecture decision and approve a narrowly scoped public entry point. Do not promote domain code to `shared` just to evade the rule. Internal feature imports use relative paths; cross-layer imports use `@/`.

## Module ownership and future contracts

| Feature                       | Owns                                                                                                      | Boundary / invariants                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| auth (implemented foundation) | Login integration, user/membership queries, session bootstrap, UX guards                                  | Core owns token lifecycle, never role claims decoded by UI                                                                   |
| weddings (read-only example)  | Wedding metadata and capacity summary, pagination, query keys                                             | Capacity is backend supplied; not client computed                                                                            |
| wedding-page                  | Templates, hero, couple/photos, story timeline, venues/map, schedule, gift/wish blocks                    | Love Story is ordered entries: `id`, `title`, `content`, `storyDate`, `imageUrl`, `sortOrder`, `visibility`; dnd-kit reorder |
| guests                        | Household/contact records, participant members, plus-one, side/relationship/dietary notes, archive/import | Backend pagination/search/filter/sort; 300+ demo guests; import preview/errors/duplicates before confirmation                |
| guest-groups                  | Named grouping metadata and membership                                                                    | Guest records remain owned by guests                                                                                         |
| invitations                   | Delivery and secure token experience, personalized links/QR                                               | Anonymous token scope; never assume a normal user account                                                                    |
| rsvp                          | Participant attendance submission and result presentation                                                 | `PENDING`, `ATTENDING`, `DECLINED`, `WAITLISTED`; backend result is authoritative                                            |
| waitlist                      | Waitlist queue and backend offers/promotions                                                              | Never infer acceptance based on locally counted guests                                                                       |
| seating                       | Tables/assignments, drag state, versioned mutations, conflict feedback                                    | dnd-kit; participant-level assignments; backend atomic capacity/version checks                                               |
| check-in                      | QR/manual search, participant/table/RSVP display, walk-ins                                                | `CHECKIN_MANAGE`; mobile/tablet; backend idempotency/duplicate prevention                                                    |
| gifts                         | Gift records, messages/wishes, participant/walk-in attribution, reporting                                 | Cash/bank QR/transfer; label sandbox payments accurately                                                                     |
| notifications                 | User notification feed/read state                                                                         | Query cache owns feed; do not duplicate in Zustand                                                                           |
| co-hosts                      | Membership invitations and permission configuration                                                       | No receptionist role; agree membership-management permission with API                                                        |
| analytics                     | Wedding reports and aggregates                                                                            | `ANALYTICS_VIEW`; backend aggregates                                                                                         |
| ai-assistant                  | Content/classification/seating/thank-you suggestions                                                      | Generate → preview → explicit confirmation → apply; never silently mutate                                                    |
| subscriptions                 | Plan presentation, entitlements, billing UX                                                               | P1 enhancements; backend entitlements authoritative                                                                          |
| admin                         | Platform users/templates/plans/audit UI                                                                   | `ADMIN`; platform administration does not automatically grant wedding access                                                 |

Only auth and weddings have implementation directories. Add other modules when their work starts. Simple modules need only their used files; complex modules can introduce `api`, `components`, `hooks`, `schemas`, `types`, `utils`, and `store` as needed. Use Zod-inferred types rather than duplicate DTO interfaces.

## Server and Client Components

All route `page.tsx`/`layout.tsx` files are Server Components. They compose containers and static UI; dynamic route params use the async App Router contract. No private data is fetched during server rendering. A client guard does not protect server-side data work—future SSR of private data requires a separately reviewed server session design.

Client boundaries:

- `app/providers.tsx`: per-provider runtime and QueryClient, avoiding shared server user caches.
- `app/error.tsx`: retry interaction; errors shown without raw exceptions.
- `core/config/runtime.tsx`: runtime context and external-store session subscriptions.
- `features/auth`: login/RHF, current-user query, session bootstrap, route/membership guards, sign-out.
- `features/weddings`: list/query consumers and realtime lifecycle component.
- `shared/layout/dashboard-shell.tsx`, `wedding-navigation.tsx`: pathname, permission, and mobile menu state.
- `shared/components/permission-guard.tsx`, `search-input.tsx`, `pagination.tsx`: context/input/callback interactions.
- `shared/forms/form-field.tsx`, `shared/ui/label.tsx`, `shared/feedback/confirm-dialog.tsx`, `error-state.tsx`: RHF/Radix/callback interactions.
- `shared/stores/ui.store.ts`: client-only sidebar state.

Presentational primitives and static states remain server-compatible. Importing one into a client container includes it in that client graph without requiring a global `use client` directive.

## Query and mutation contracts

Query keys are factories, never scattered literals. Lists include filters/page/pageSize/sort; wedding-specific entities always include `weddingId`, even if entity IDs currently appear globally unique. Example: future `guestKeys.detail(weddingId, guestId)`. This deliberately strengthens the suggested guest-only detail key to prevent tenant collisions. No existing keys need migration.

The weddings example uses `weddingKeys.list(params)` and parses the full page response with Zod. Its input changes immediately; cancellation prevents stale responses. Add a feature-local debounced search when the backend workload warrants it. Never load all 300 guests merely to paginate them in the browser.

Queries default to 30-second freshness, five-minute garbage collection, focus refetch, and up to two retries except known 4xx errors. Mutation retries are disabled. Current user/access stay in Query, access token state stays in the session manager, and UI selections stay in Zustand or local React state. No Query persistence stores PII in browser storage.

Each future mutation declares its cache effects. Examples: create/archive a guest invalidates that wedding's guest lists and summary; RSVP invalidates attendance, capacity, and waitlist data; seat assignment invalidates that wedding's seating and table capacity. Avoid broad application-wide invalidation except session changes. Forms map backend field names through an explicit allowlist to field-level errors and also show a safe form-level error.

## Authentication and permissions

JWT injection only occurs for `auth: "required"` calls. Tokens are never persisted or exposed through public environment variables. Refresh is explicitly opt-in and shared across concurrent callers. Session generations prevent stale requests from exposing a previous account's data. Logout with refresh enabled must revoke the backend cookie before reporting successful sign-out; failure stays visible/retryable. Without refresh, logout clears the local token and remote expiry remains authoritative.

The frontend obtains current user and membership permissions from the API. Navigation definitions provide one reusable mapping from route sections to permissions. `PermissionGuard` and `usePermission` read the same context; pending access is denied. The initial co-host/settings mapping uses `WEDDING_EDIT` from the supplied permission set; the backend team must confirm membership management semantics before implementing those workflows. Administrators receive no implicit wedding permission bypass.

There is intentionally no `middleware.ts`/`proxy.ts`: backend-origin refresh cookies are not visible to the frontend server, and presence alone proves nothing. Next 16 names the optional request interception convention `proxy.ts`. Client guards are navigation UX, not security boundaries. Every endpoint and hub join must independently validate JWTs, membership, permissions, token scope, and revocation.

Invitation pages do not use AuthGuard. Future token APIs must pass `auth: "none"`, avoid cookies, avoid logging tokens, and treat the token as a scoped capability with backend expiry/revocation. Do not put invitation token data into generic user query keys.

## Realtime and seating concurrency

The runtime creates one SignalR manager. Only the authorized wedding layout activates it. Feature hooks register/unregister handlers; they must not create their own HubConnection. Initial startup failures retry as well as dropped connections. The manager serializes lifecycle operations, reconnects, rejoins the wedding, and emits resync notifications. Features invalidate only their own keys. Core never imports a feature key factory.

Messages are invalidation hints, not authoritative snapshots. The example validates wedding ID and version, then invalidates summary queries on capacity changes. Rejoin invalidates cached summaries to cover missed events. Ignore unrelated wedding IDs. Each future feature registers its own event/resync handlers and cleans them up on unmount.

Seating implementation must follow this contract:

1. Load server version, participant assignments, and capacity/occupancy. Display `Table 05` and `8 / 10 guests`; these are participant counts.
2. dnd-kit updates temporary drag/selection state, not an independent authoritative guest collection.
3. Submit an assignment with the loaded `version` (or agreed If-Match token). Backend atomically checks permissions, capacity, and version; never silently overwrite.
4. On 409: discard/rollback the tentative move and refetch the seating query. Only after successful refetch show: **“Seating data has changed. Latest data has been reloaded.”** If reload fails, show a retryable error instead of claiming success.
5. Realtime invalidates affected keys. If updates arrive during a drag, retain only presentation intent until a new version is loaded; do not auto-apply the stale move.
6. Seat-level placement, offline/reconnect interactions, keyboard drag support, and concurrent host/co-host edits require integration tests against the real backend.

Backend capacity is participants, not households: a guest plus spouse plus child is three participants. RSVP returns confirmed/pending/declined/waitlisted states and capacity; the frontend never promotes people based solely on local math. QR check-in must use backend duplicate/idempotency guarantees. None of these business workflows is implemented in this foundation.

## Team workflow

Suggested ownership: (1) auth/co-hosts/core integration, (2) weddings/website, (3) guests/import/invitations, (4) RSVP/waitlist/check-in, (5) seating/gifts/dashboard. These are code ownership suggestions, not isolated vertical silos; pair on shared contracts and review cross-boundary changes.

Agree DTOs/query keys/events before concurrent implementation. Keep feature PRs independent and small; nominate a reviewer for changes to core/shared. Run lint, typecheck, tests, formatting, and production build before merging. Review generated shadcn files as source. Add meaningful tests for lifecycle, security boundaries, conflicts, and backend contracts rather than tests that merely repeat JSX.

The local ESLint boundary rule enforces imports including relative paths. It is a practical guardrail, not a whole-program cycle proof. Public feature barrels should export only deliberate integration surfaces; keep schema/types local unless another layer truly consumes them. Avoid additional aliases or dynamic computed imports that bypass static checks.

## Deployment and validation limits

No backend is provided here. Auth, cookie/CSRF/CORS policy, hub join/event names, seating versions, and guest token behavior require backend integration validation. Set public environment at build time. Review deployment CSP and allowed media/map domains when the actual website feature needs them; avoid guessing an allowlist now. Transport errors are safe for users, but production telemetry and redaction remain a separate deployment decision.

References: [Next.js proxy convention](https://nextjs.org/docs/app/getting-started/proxy), [shadcn manual installation](https://ui.shadcn.com/docs/installation/manual), [SignalR JavaScript lifecycle](https://learn.microsoft.com/en-us/aspnet/core/signalr/javascript-client?view=aspnetcore-10.0), [SignalR authentication](https://learn.microsoft.com/en-us/aspnet/core/signalr/authn-and-authz?view=aspnetcore-10.0).
