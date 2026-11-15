# API

All patient-data endpoints require the HttpOnly `curacircle_token` cookie established after a verified Firebase Google login. The server selects the patient and actor from care circle membership; client `actorRole` and cross-circle IDs cannot grant permissions. Mutations reject foreign origins. Errors return an `error` string and an HTTP status.

| Endpoint | Behavior |
| --- | --- |
| `POST /api/auth/session` | Verify `{idToken}` from Firebase Google authentication; optionally select an authorized `{profileId}` in an existing session. |
| `GET /api/auth/session` | Return safe profile data, membership, accessible circles and onboarding status. |
| `DELETE /api/auth/session` | Clear the server session; the client also signs out of Firebase. |
| `POST /api/auth/login` | Retired shared-PIN endpoint; returns 410. |
| `POST /api/onboarding` | Create a manually entered patient and at least two distinct family members. See `OnboardingSchema`. |
| `GET/POST/PUT/DELETE /api/members` | Read care circle members; only the owner can invite, edit or remove. Keep two family members. |
| `POST /api/gemini/scan-prescription` | Validate `{imageBase64,mimeType}`, call live Gemini and return a server-held prescription draft. Nothing is scheduled yet. |
| `POST /api/prescriptions/apply` | Apply `{draftId}` once, save all extracted medicines and notify family. Drafts expire after one hour. |
| `GET/POST/PUT/DELETE /api/medications` | Read, add, update or remove medications in the authorized circle. |
| `GET/POST/DELETE /api/adherence` | Read schedule and real statistics, record dose actions, exclude a dose from that day's schedule. |
| `GET/POST/PUT/DELETE /api/appointments` | Manage appointments for the authorized circle. |
| `GET /api/notifications` | Return the current member's notifications and unread count. |
| `PATCH /api/notifications` | Mark own notifications read, optionally using `{notificationId}`. |
| `GET /api/outbox` | Owner sees circle delivery history; other members see their own emails. |
| `POST /api/outbox` | Send a server-generated test alert to `{to}`; owner may select a circle member, others only themselves. |
| `POST /api/scheduler/tick` | Run the signed-in circle's reminder checks. |
| `GET /api/scheduler/tick` | External cron; requires `Authorization: Bearer <CRON_SECRET>` and checks configured circles. |
| `POST /api/sos` | Broadcast an alert to the authorized circle. |
| `GET /api/audit` | Read the authorized circle's audit events. |

Medication and appointment updates use `{id,updates}`; member updates use the same shape. Refer to `src/lib/validations/schemas.ts` and `src/lib/services/circle.service.ts` for validation. No API response includes passcode hashes. Unauthenticated requests never return a demo patient.
