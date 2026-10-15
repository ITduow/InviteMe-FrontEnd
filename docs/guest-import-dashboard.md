# Guest import dashboard

Reference: Stitch project `5903965086507614911`, InviteMe Wedding Guest Dashboard, five InviteMe Blush screens. Uses the repository's pink tokens, Noto Serif headings, Be Vietnam Pro body and existing protected workspace shell.

## Backend contracts

All paths are relative to NEXT_PUBLIC_API_URL, which must include `/api`.

| UI                     | API                                       | Permission / meaning                                                                                           |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Contact/household list | GET /weddings/{id}/guests                 | GUEST_VIEW. Backend pagination, search representative name/code, sort, active/archive and withoutInvitation    |
| Household detail       | GET /weddings/{id}/guests/{guestId}       | GUEST_VIEW. Wedding-scoped contact metadata and members; no mutation or seating data                           |
| Individual list        | GET /weddings/{id}/participants           | GUEST_VIEW. Active guests only. Participant-level RSVP; independent pagination                                 |
| Summary cards          | GET /weddings/{id}/reports/summary        | ANALYTICS_VIEW. Optional; no request without permission. Estimated attendance is not the count of named people |
| Classification labels  | GET /weddings/{id}/guests/import-options  | GUEST_EDIT                                                                                                     |
| File preview           | POST /weddings/{id}/guests/import/preview | Multipart `file`, CSV/XLSX, 5 MB, 500 nonblank data rows. Does not save guests                                 |
| Confirm                | POST /weddings/{id}/guests/import/confirm | V2 groupKeys, V1 rowNumbers. Duplicates require acknowledgement. Invalid member blocks its entire household    |

UI data comes from APIs, with no production mock fallback. Empty/loading/error are separate states. Contact booleans are displayed as availability, never invented addresses/phone numbers. Published invitation means published, not delivered. `withoutInvitation` means not created, not unsent. Role/RSVP labels are independent. Unknown classification remains unclassified.

## Import

FE owns public/templates/khach-moi.csv, exactly ten V2 columns and a four-person household example. Examples must be replaced before import; Excel should keep phone columns as text. The template accepts code or label from API options. Additional allowance creates no unnamed participant. Existing contacts are not merged/updated.

Preview selects valid whole households by default. Each error/warning retains its spreadsheet row and column. V2 preview includes original rawValues for every structurally valid row. The eye action opens an editor for names, roles and representative metadata. Saving reconstructs CSV with original row numbers and untouched raw values, then uses the existing authenticated preview API to revalidate the whole file and create a new session. No client-supplied rows can be confirmed directly. Duplicate acknowledgement resets, invalid groups are deselected, and confirm is disabled while editing. Legacy or structurally malformed files must be fixed in the source file. Rechecks send replacesImportId: backend atomically retires the owned unconfirmed preview, so repeated edits do not consume the ten-live-session allowance. Confirmed/expired/foreign sessions cannot be replaced. Edits are for this import only; the original Excel file is unchanged. Thirty-minute session expiry is checked before confirm. After the first confirm attempt selection is locked; retry sends the identical payload, including acknowledgement, for backend idempotency. Choose a new file to change selection. Successful import invalidates wedding-scoped guest/participant/report queries and wedding summaries. No invitation, RSVP or seat mutation occurs.

## Deliberate differences from generated Stitch screens

The existing guest list remains an invitation picker and excludes private contact fields and members. A new read-only detail endpoint supports the drawer on demand, with GUEST_VIEW checks, wedding/guest scope and a consistent database snapshot. It returns actual contact metadata, classification, additional allowance and each participant's ID/role/RSVP. It does not weaken picker privacy or introduce mutations. The list does not infer family size from the current participant page. Seat labels, dietary notes and edit/delete actions are omitted where unsupported.

No automated seating, paper invitation delivery, QR printing, live-sync indicator or RSVP filters are claimed. Reports expose estimates and attendance aggregates; their semantics are kept instead of labeling them “total guests”. Individual list totalCount is the count of active named participants, and the household list totalCount follows its current filters. No totals are computed from one page.

## Validation

Guest tests cover whole-family rejection, V1/V2 confirm contracts, null classification, named persons vs quota, file limits, authenticated multipart requests, filters and retry payloads. Run npm run check and npm run build. Browser integration requires a running backend with migrations applied, configured API URL, and an account with wedding permissions. Uploading sample CSV is a real database write; use a disposable wedding/database.

Validation evidence: 21 FE tests passed, lint/typecheck and production build passed. Whole-repository format:check has 108 pre-existing failures from main; changed files are formatted separately. Real browser upload of the 250-person XLSX into a disposable PostgreSQL wedding returned 100 groups / 250 people with zero preview errors, 250 pending, zero attending and zero seated. Detail reader integration tests cover members/quota, authentication, outsider denial, missing guests, cross-wedding scoping and existing picker privacy.

Browser checks also verified empty state, a literal group-code search, mobile cards without page overflow, and CSV with an invalid child: the entire bad family is disabled while the valid solo remains selectable. Reuploading existing codes is rejected; selected uncoded duplicates require acknowledgement. Preview is paginated by ten groups, with selection and totals across all pages.
