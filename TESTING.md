# Testing Strategy — CuraCircle AI

## 1. Test Architecture
We enforce 100% automated test coverage across all critical business logic, security layers, clinical algorithms, and accessibility standards using **Vitest 2.1**:

### §1.1 Passcode Security & Cryptographic Auth (`auth.test.ts`)
*   Verifies salted bcrypt hashing and password verification for Elder (`1122`), Caregiver (`4321`), and Family (`5678`) roles.
*   Asserts sliding-window brute-force rate limiter locks out unauthorized actors after 5 failed attempts.
*   Asserts cryptographically signed JWT tokens are properly validated and tampered tokens are rejected.

### §1.2 Prescription Schedules & Inventory Refill (`medication.test.ts`)
*   Tests CRUD lifecycle for medication schedules.
*   Verifies sorting by scheduled time ascending.
*   Tests refill inventory tracking, threshold warnings, and audit trail generation.

### §1.3 Adherence Compliance & Streak Tracking (`adherence.test.ts`)
*   Asserts daily dose schedule generation for active medications.
*   Verifies dose state transitions (`TAKEN`, `SKIPPED` with reason, `SNOOZED`).
*   Validates compliance calculation formulas for Today (%) and 7-day adherence trends.
*   Tests automated missed dose detection when scheduled time exceeds grace period.

### §1.4 Doctor Appointments & Escort Coordination (`appointment.test.ts`)
*   Tests appointment scheduling, clinic details, chronological sorting, and family escort assignments.
*   Verifies filtering between upcoming and completed consultations.

### §1.5 Clinical Safety & Contraindications (`safety.test.ts`)
*   Tests drug-drug and food contraindication rules (Atorvastatin + Grapefruit, Lisinopril + Potassium salt substitutes).
*   Verifies senior voice companion ("Amity") emotional state detection and symptom triage.
*   Tests doctor pre-visit consultation question synthesis.

### §1.6 Proactive Email Notifications & Outbox (`email.test.ts`)
*   Verifies upcoming dose alerts, missed dose escalations, and emergency SOS dispatch.
*   Asserts autonomous scheduler tick evaluates adherence criteria and logs to outbox.

### §1.7 Accessibility Constraints (`a11y.test.ts`)
*   Verifies touch target dimension constraints satisfy senior requirements ($\ge 48$px standard, $\ge 64$px Elder mode).
*   Asserts high-contrast color palettes satisfy WCAG AAA standards ($\ge 7:1$).
*   Verifies dual-encoding contracts (icon + text + accessible color).

---

## 2. Test Execution
To run all tests:
```bash
npm test
```
*Current Status: 7 passed test suites, 28 passed tests (100% passing rate).*
