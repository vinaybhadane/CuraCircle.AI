# CuraCircle AI

Medication management with Firebase Google sign-in, family care circles, Gemini prescription scheduling, email alerts and in-app notifications. The existing dashboard layout and styles are retained.

## Run locally

```sh
npm install
npm run dev
```

Configure `.env` from `.env.example`. In Firebase Console, enable Authentication > Google and add your local/production hostname under Authorized domains. The Firebase web configuration can be supplied with `NEXT_PUBLIC_FIREBASE_*`; the existing project configuration remains the fallback. Google ID tokens are verified by Firebase Admin on the server, including the provider and verified email. No anonymous account, shared PIN, or client-created mock user grants access.

## Account flow

1. Sign in with Google. New accounts start empty.
2. Select Patient or Family member. Enter the patient details manually and add at least two distinct family contacts using their Google emails. A family member setting up a patient also enters the patient's own Google email.
3. Upload a PNG, JPEG, WEBP or PDF prescription (maximum 5 MB), or download `public/demo-prescription.png` and upload it.
4. Gemini extracts every readable medicine and generates reminder times. Review the extracted dose, frequency, duration and times against the prescription, then save. A failed API call, missing key or unreadable prescription produces an error and creates no medicines. The sample also uses the live Gemini API.
5. Family members sign in with their invited Google email to access the same patient, add or modify medication schedules, and check their own notifications. The profile owner manages invitations, contact details and roles. At least two family members must remain.

Automatic schedules come exclusively from Gemini. Manual medication and schedule editing remains available to authorized patients and family members. Reapplying the same prescription draft cannot duplicate medicines. Completed dose history is preserved when future times change.

## Email and notifications

Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (a verified sender) and optionally `BREVO_SENDER_NAME`, or configure SMTP. Care circle invitations, prescription imports and schedule changes notify the added contacts. Upcoming dose reminders respect notification preferences; missed-dose, appointment, refill and SOS alerts use the same circle members.

The header mail button opens personal in-app notifications and an email outbox. `SENT` means the email provider accepted the request; it does not guarantee inbox delivery. Missing email configuration produces `SIMULATED` previews; rejected delivery is `FAILED`. In-app alerts are retained independently of email delivery. Browser notifications are optional and work while the website is open.

The website checks reminders every minute while open. For reminders while it is closed, configure an external scheduler to call `GET /api/scheduler/tick` every minute with `Authorization: Bearer <CRON_SECRET>`. Keep `CRON_SECRET` server-side. Scheduling uses the patient's saved timezone, not the server timezone; Gemini is called when processing a prescription, and the scheduler executes the saved times without repeatedly asking AI.

## Storage and deployment

This repository uses a file-backed server database. Local data is persisted in `data/curacircle_store.json`, or `CURACIRCLE_DATA_DIR` when configured. API operations use a filesystem lock and atomic writes so Next.js workers on the same persistent disk do not overwrite each other's changes. Patient access is scoped to verified membership on every API request. Legacy demo records are never attached to a real Google account.

**Production requires persistent storage.** Use a Node server with a shared persistent disk, or replace the repository storage with a durable hosted database before deploying to ephemeral/serverless hosting. Vercel `/tmp` is temporary and cannot retain or share patient data reliably across instances. Do not treat the local JSON store as a production medical-record system. Set a unique random `JWT_SECRET` of at least 32 characters and enable HTTPS. Firebase service account credentials are not required for the existing ID-token verification flow.

## Verify

For Vercel, commit both `package.json` and `package-lock.json` with the scoped `jwks-rsa` / `jose` compatibility override. The project pins Node.js 24.x. This avoids the Firebase Admin CommonJS import failure that can otherwise make the entire session route return an HTML 500 page, including GET and DELETE. The Firebase Admin SDK is loaded only when verifying a Google token, so session checks and sign-out remain independent of that import.

Set `JWT_SECRET` to a unique random value of at least 32 characters in the hosting project's Production environment and redeploy after changing environment variables. Missing or invalid session configuration now returns JSON with `AUTH_CONFIGURATION_ERROR`; Firebase verification infrastructure failures return `AUTH_SERVICE_UNAVAILABLE`. Neither response contains credentials. Browser `window.closed` warnings can still be emitted by Google's popup page even when the app sends `Cross-Origin-Opener-Policy: same-origin-allow-popups`; inspect the `/api/auth/session` response separately.

```sh
npm test
npx tsc --noEmit
npm run build
node scripts/verify-http.mjs
npx vite-node --config vitest.config.ts scripts/verify-prescription.ts
```

Tests use an isolated temporary data directory and simulated delivery; they never send real emails or modify the user's patient store. The final command performs an actual Gemini request using the downloadable fictional prescription and the configured server API key.

The HTTP check starts and stops a local production server with CommonJS `require(ESM)` support disabled, checks session GET/POST/DELETE and the OAuth opener header, and never signs in a real user or sends messages.
