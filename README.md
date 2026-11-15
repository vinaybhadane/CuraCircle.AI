# CuraCircle AI

Medication management with Firebase Google sign-in, family care circles, Gemini prescription scheduling, email alerts and in-app notifications. The existing dashboard layout and styles are retained.

## Run locally

```sh
npm ci
npm run dev
```

Configure `.env` from `.env.example`. In Firebase Console, enable Authentication > Google and add your local/production hostname under Authorized domains. Supply the Firebase web configuration using `NEXT_PUBLIC_FIREBASE_*`. Use Node.js 24.12 or newer in the 24.x release line. Google ID tokens are verified by Firebase Admin on the server, including the provider and verified email. No anonymous account, shared PIN, or client-created mock user grants access.

## Account flow

1. Sign in with Google. New accounts start empty.
2. Select Patient or Family member. Enter the patient details manually and optionally add family contacts using their Google emails. A family member setting up a patient also enters the patient's own Google email.
3. Upload a PNG, JPEG, WEBP or PDF prescription (maximum 5 MB), or download `public/demo-prescription.png` and upload it.
4. Gemini extracts every readable medicine and generates reminder times. Review the extracted dose, frequency, duration and times against the prescription, then save. A failed API call, missing key or unreadable prescription produces an error and creates no medicines. The sample also uses the live Gemini API.
5. Family members sign in with their invited Google email to access the same patient, add or modify medication schedules, and check their own notifications. The profile owner manages invitations, contact details and roles.

Automatic schedules come exclusively from Gemini. Manual medication and schedule editing remains available to authorized patients and family members. Reapplying the same prescription draft cannot duplicate medicines. Completed dose history is preserved when future times change.

## Email and notifications

Set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (a verified sender) and optionally `BREVO_SENDER_NAME`, or configure SMTP. Care circle invitations, prescription imports and schedule changes notify the added contacts. Upcoming dose reminders respect notification preferences; missed-dose, appointment, refill and SOS alerts use the same circle members.

The header mail button opens personal in-app notifications and an email outbox. `SENT` means the email provider accepted the request; it does not guarantee inbox delivery. Missing email configuration produces `SIMULATED` previews; rejected delivery is `FAILED`. In-app alerts are retained independently of email delivery. Browser notifications are optional and work while the website is open.

The website checks reminders every minute while open. For reminders while it is closed, configure an external scheduler to call `GET /api/scheduler/tick` every minute with `Authorization: Bearer <CRON_SECRET>`. Keep `CRON_SECRET` server-side. Scheduling uses the patient's saved timezone, not the server timezone; Gemini is called when processing a prescription, and the scheduler executes the saved times without repeatedly asking AI.

## Storage and deployment

Vercel uses Firestore as the authoritative server database. Every successful API mutation awaits its durable commit. A shared lease and fenced atomic commit serialize concurrent workers, so retries cannot deduct the same dose twice and cold starts cannot lose schedules. Existing Firestore collections are read directly; temporary-file records that were never saved to Firestore cannot be recovered automatically. Missing patient records are never invented from JWT claims.

Before the automatic GitHub deployment:

1. Add `FIREBASE_SERVICE_ACCOUNT_JSON` to the Vercel project's **Production** environment. Its value is the entire JSON service-account credential for the Firebase project. Keep it server-only; never commit it or prefix it with `NEXT_PUBLIC_`. The account needs Firestore read/write IAM permissions.
2. Publish `firestore.rules` to the same Firebase project (Console ? Firestore ? Rules, or `firebase deploy --only firestore:rules --project curacircle-7b8fd` while logged into its owner account). Browser access is denied; the Admin SDK uses IAM and authorizes users through the application API.
3. Set a unique random `JWT_SECRET` of at least 32 characters, the public Firebase settings, and any Gemini/email keys. Push `main` to trigger Vercel, or redeploy after an environment-variable change.

No paid tier or billing upgrade is required by this change. Existing free-service quotas still apply. The dashboard refresh is one request per minute while visible; inactive tabs stop polling. API reads are limited to the relevant circle and collections, and normal mutations append audit entries without reading the complete audit history. Background reminders while the site is closed still require an external scheduler; this repository does not enable a paid scheduler.

For local development, data uses `data/curacircle_store.json` or `CURACIRCLE_DATA_DIR`. Set `CURACIRCLE_STORAGE=firestore` plus the server credential to exercise the hosted backend locally. Vercel never falls back to temporary files: missing credentials return `STORAGE_CONFIGURATION_ERROR` instead of pretending a record was saved. The shared lease is intended for this small application; higher traffic needs partitioned persistence and a dedicated notification outbox. Email delivery and the database commit are not a distributed transaction, so provider delivery cannot be guaranteed exactly once after a server interruption.

## Verify

For Vercel, commit both `package.json` and `package-lock.json` with the scoped `jwks-rsa` / `jose` compatibility override. The project pins Node.js 24.x. This avoids the Firebase Admin CommonJS import failure that can otherwise make the entire session route return an HTML 500 page, including GET and DELETE. Firebase Admin authentication is loaded only for Google token verification; authenticated data requests separately load the Firestore Admin SDK. Unauthenticated checks and sign-out do not need storage access.

Set `JWT_SECRET` to a unique random value of at least 32 characters in the hosting project's Production environment and redeploy after changing environment variables. Missing or invalid session configuration now returns JSON with `AUTH_CONFIGURATION_ERROR`; Firebase verification infrastructure failures return `AUTH_SERVICE_UNAVAILABLE`. Neither response contains credentials. Browser `window.closed` warnings can still be emitted by Google's popup page even when the app sends `Cross-Origin-Opener-Policy: same-origin-allow-popups`; inspect the `/api/auth/session` response separately.

```sh
npm test
npx tsc --noEmit
npm run build
node scripts/verify-http.mjs
# Optional Firestore emulator integration checks (see TESTING.md)
npm run test:integration
```

Tests use an isolated temporary data directory and simulated delivery; they never send real emails or modify the user's patient store. The integration command requires a localhost Firestore emulator and refuses a production host.

The HTTP check starts and stops a local production server with CommonJS `require(ESM)` support disabled, checks session GET/POST/DELETE and the OAuth opener header, and never signs in a real user or sends messages.
