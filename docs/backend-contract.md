# Proposed frontend ↔ ASP.NET integration contract

These contracts are **proposals**, not claims about an existing backend. Align this document and feature API/schema files with the API team before integration. Next.js provides no backend endpoints.

## Auth

| Endpoint under API base     | Request                                                               | Success                                                |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| `POST /auth/login`          | `{ email, password }`; credentials included to accept optional cookie | `{ accessToken: string, expiresIn: number }` (seconds) |
| `POST /auth/refresh`        | Credentials included, no body                                         | Same token response; rotate refresh cookie             |
| `POST /auth/logout`         | Credentials included, no body                                         | 204; revoke refresh session and expire cookie          |
| `GET /auth/me`              | Bearer JWT                                                            | `{ id, displayName, email, role: "USER" \| "ADMIN" }`  |
| `GET /weddings/{id}/access` | Bearer JWT                                                            | `{ weddingId, permissions: WeddingPermission[] }`      |

Use an HttpOnly, Secure refresh cookie with deployment-appropriate SameSite/path/domain attributes. Do not send refresh tokens in JSON to the frontend. The API must protect cookie-based auth endpoints against CSRF using a reviewed origin/CSRF policy. The frontend sends no assumed custom CSRF token header yet; if double-submit is chosen, add explicit header support before enabling refresh. Credentialed CORS must allow the exact frontend origin, never `*`. Different-origin does not always mean different-site; genuinely cross-site cookies face browser third-party restrictions, so prefer same-site custom domains when deploying.

Expired/revoked refresh responds with 401/403. Temporary refresh failure must be distinguishable from invalid credentials. The frontend preserves retryability on temporary failures. Never interpret a decoded JWT as authoritative UI membership.

## Weddings example

`GET /weddings?page=1&pageSize=20&search=&sort=weddingDate`

```json
{
  "items": [
    {
      "id": "wedding-id",
      "title": "Our celebration",
      "weddingDate": "2027-04-12",
      "participantCount": 120,
      "maxCapacity": 150,
      "version": 1
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

Date-only `YYYY-MM-DD` or null for weddingDate; no accidental timezone conversion. Page numbers start at 1. `participantCount` means backend-confirmed attendance, not the number of primary guest contacts. Confirm that interpretation with the API team. All numeric values are nonnegative except page/pageSize, which must be positive. API owns sorting, pagination, access filtering, and totals. Responses are direct DTOs; there is no assumed `{ data }` envelope. If the real backend has one, unwrap it once in transport/schema integration.

## Errors

ASP.NET ProblemDetails/ValidationProblemDetails are accepted as untrusted payloads. The UI classifies by status, ignores raw title/detail/stack, and maps recognized field names from `{ errors: { Email: ["..."] } }` to safe generic validation messages. Optional safe error codes can be added as an explicit allowlist later.

| Status | Frontend behavior                                                              |
| ------ | ------------------------------------------------------------------------------ |
| 400    | Safe field/form validation                                                     |
| 401    | One shared refresh/retry for protected calls, then clear session; no loop      |
| 403    | Forbidden; no automatic role elevation                                         |
| 404    | Resource missing                                                               |
| 409    | Conflict; feature must roll back/refetch, never silently overwrite             |
| 422    | Business-rule failure; show backend-derived state only through typed safe DTOs |
| 500+   | Generic service failure, no exception text                                     |

Successful invalid JSON/DTOs are contract errors. AbortError remains cancellation. Mutations are never automatically retried except one 401 recovery; backend must reject unauthenticated requests before applying side effects. Add idempotency keys for check-in/payment-like operations when implementing them.

## SignalR

Hub URL comes from `NEXT_PUBLIC_SIGNALR_URL`. The only proposed group method used now is `JoinWedding(weddingId)`. Disconnect leaves groups; reconnect must invoke JoinWedding again. Server derives group names and checks the caller's membership. Rejection cannot be treated as authorization success.

Events: `RsvpUpdated`, `CapacityUpdated`, `WaitlistUpdated`, `SeatingUpdated`, `TableCapacityUpdated`, `CheckInUpdated`.

Minimum payload: `{ weddingId: string, version: number }`. Features invalidate relevant queries; they do not trust events to update authoritative capacity locally. For future high-frequency seating changes, agree event IDs/entity IDs/version ordering before applying patches directly.

SignalR gets tokens from the same session manager. Server must validate access tokens for hub negotiation, close/re-authorize revoked/expired sessions as appropriate, redact access-token query parameters from logs, and enforce permission checks inside hub methods. No secrets or user-specific data should appear in client connection logs; this foundation uses `LogLevel.None`.

## Contracts to agree before business implementation

- Secure invitation token transport, expiry/revocation, read/RSVP/check-in scope, and rate limiting.
- Participant IDs vs household/contact IDs; plus-one and walk-in schema.
- RSVP result with participant attendance states and authoritative confirmed/waitlisted capacity.
- Seating write version, atomic conflict handling, capacity checks, and 409 response.
- Import preview, duplicate/errors reporting, confirmation/job lifecycle.
- Co-host permission administration policy, gift sandbox labels, and AI preview/confirm/apply.

No assumption in this document transfers authorization or business enforcement to the frontend.
