# Code Quality Guidelines — CuraCircle AI

## 1. Directory Structure & Architecture
We maintain strict segregation of components, domain models, business logic services, typings, database persistence, and automated tests:
*   `src/app/` — Next.js 14 App Router layout, page controllers, and RESTful API endpoints.
*   `src/components/` — Modular, atomic React components (ElderMode, CaregiverDashboard, Accessible Modals, Navbar).
*   `src/lib/types/` — Shared TypeScript domain models, interfaces, and enums.
*   `src/lib/services/` — Business logic services (AuthService, MedicationService, AdherenceService, AppointmentService, EmailService, GeminiService).
*   `src/lib/validations/` — Strict Zod input validation schemas for all API payloads.
*   `src/lib/db/` — ACID-compliant persistent database service with atomic writes and in-memory caching.
*   `src/lib/__tests__/` — Comprehensive Vitest automated test suites covering all critical logic, security, and accessibility.

## 2. Strict Compiler Options
We enforce high compiler safety thresholds in `tsconfig.json`:
*   `strict: true` — Full type strictness checking across all files.
*   `noImplicitAny: true` — Prevents undeclared variables from falling back to `any`.
*   `strictNullChecks: true` — Restricts unchecked null/undefined access.
*   `noUnusedLocals: true` & `noUnusedParameters: true` — Prevents dead code and orphan variables.
*   `noEmit: true` — Next.js compiler manages output artifacts without polluting source directories.

## 3. Linter Rules (Oxlint & ESLint)
We integrate Oxlint (`.oxlintrc.json`) configured with modern rules targeting:
*   React Hooks rule compliance (preventing missing dependencies and stale state closures).
*   TypeScript strictness checks.
*   Zero console leakage in production builds.
*   Standard clean-code style verification.
