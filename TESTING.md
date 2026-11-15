# Testing CuraCircle

Use Node.js 24.12+ within the 24.x release line and `npm ci`.

```sh
npm test
npm run lint
npm run build
node scripts/verify-http.mjs
npm audit
```

The unit/API suite covers Google sessions, authorization, circle isolation, onboarding, prescriptions, medication schedules, doses, inventory, appointments, notification delivery status, and runtime compatibility. Tests use an isolated temporary file store and simulated email. The inherited accessibility tests are static assertions, not a browser accessibility audit; no claim of complete coverage or zero bugs is made.

`regressions.test.ts` covers missing generated dose records, retry idempotency, excluded and cross-circle doses, stale JWT memberships, private circle lists, date validation, snooze expiry, frequency edits, retained dose history, rescheduled appointment reminders, and cron authorization.

For actual multi-worker persistence, start a local Firestore emulator on port 8188 with a demo project (never the real project). If Firebase CLI's emulator is installed:

```powershell
java -jar "$env:USERPROFILE/.cache/firebase/emulators/cloud-firestore-emulator-v1.21.0.jar" --host 127.0.0.1 --port 8188 --project_id demo-curacircle-regression
```

In another PowerShell window:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8188'
npm run test:integration
```

The integration suite uses its own `demo-curacircle-<pid>` namespace. It checks a GET schedule on worker A followed by POST taken on worker B, a fresh worker retry, inventory idempotency, concurrent writes, deletions, error rollback, lease expiry, and scoped reads preserving unloaded data. It refuses non-localhost emulator hosts and never sends real emails.

The HTTP smoke script runs the production build with an isolated data directory, checks public assets, rejects unauthenticated APIs and invalid Google tokens, verifies the OAuth popup header, and confirms sign-out works. CI repeats unit/API tests, type checks, the production build, and the dependency audit on pushes to main and pull requests. Live Google sign-in, external Gemini responses, email delivery, provider quotas, and production IAM configuration require separate deployment validation.
