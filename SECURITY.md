# Security, Authentication & Compliance Architecture

## Security Objectives

CuraCircle AI manages sensitive health information for elderly individuals and their families. To guarantee compliance and security, the system enforces multi-layered defense-in-depth principles:

---

## 1. Passcode-Based Authentication & Cryptographic Hashing

* **Salted Bcrypt Hashing:** All passcodes (`1122` for Elder, `4321` for Caregiver, `5678` for Family) are cryptographically hashed using `bcryptjs` with 10 salt rounds before storage. Plaintext PINs are never persisted or returned in API responses.
* **Brute-Force Protection & Sliding Window Rate Limiting:**
  * Managed by `AuthService.checkRateLimit`.
  * Allows a maximum of **5 failed attempts** within a 5-minute sliding window per client IP/profile ID.
  * Upon the 6th failed attempt, the profile/IP is locked out for 5 minutes, preventing automated dictionary or brute-force attacks.
  * Every failed and successful attempt is recorded in the security audit trail.

---

## 2. Session Management & Role-Based Access Control (RBAC)

* **Signed JWT Sessions:** Authenticated sessions issue JSON Web Tokens signed with a secure 256-bit secret key, with an expiration of 7 days.
* **HttpOnly Cookies:** Tokens are stored in secure, `HttpOnly`, `SameSite=Lax` cookies, preventing cross-site scripting (XSS) token exfiltration.
* **Granular Role Permissions:**
  * `ELDER`: Restricted to adherence logging, voice interaction, and SOS alerts. Cannot modify prescription definitions or delete appointments.
  * `PRIMARY_CAREGIVER`: Full administrative authority over medication schedules, refill thresholds, and clinical appointments.
  * `FAMILY_MEMBER`: Read-only access to schedules, adherence records, and email alerts; can assign escort drivers.
  * `CLINICIAN`: Clinical prescription adjustment and consultation note entry.

---

## 3. Input Validation & API Defense

* **Zod Schema Enforcement:** All API routes (`/api/medications`, `/api/adherence`, `/api/appointments`, `/api/auth/login`, `/api/sos`) validate payloads using strict Zod schemas located in `src/lib/validations/schemas.ts`. Malformed inputs, script tags, or extra fields are rejected with HTTP 400.
* **Security Headers:** The application enforces strict HTTP response headers configured in `next.config.js`:
  * `X-Frame-Options: DENY` (prevents clickjacking)
  * `X-Content-Type-Options: nosniff` (prevents MIME type sniffing)
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Permissions-Policy: camera=*, microphone=*` (restricts sensor access to authorized interactions)

---

## 4. Immutable Audit Trail

Every state change is recorded in `db.auditLogs` with:
* Unique event ID
* ISO 8601 UTC timestamp
* Actor name and authenticated role
* Action identifier (`MEDICATION_ADDED`, `DOSE_MARKED_TAKEN`, `AUTHENTICATION_SUCCESS`, `EMERGENCY_SOS_TRIGGERED`, etc.)
* Human-readable description
Audit logs cannot be modified or deleted via user-facing APIs.
