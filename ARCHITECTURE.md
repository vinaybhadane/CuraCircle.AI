# System Architecture & Technical Specification

## Overview

CuraCircle AI is architected as an interconnected, accessible healthcare platform designed to solve the challenges of geriatric medication compliance, clinical coordination, and proactive family guardian oversight.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  +----------------------------------+     +------------------------------------+  |
|  |       Elder Kiosk View           |     |     Caregiver & Family Center      |  |
|  | - Scalable Typography (100-150%) |     | - Adherence Dashboard & Gauges     |  |
|  | - Touch Targets >= 64px          |     | - Medication & Refill Manager      |  |
|  | - Web Speech TTS & Voice Input   |     | - Doctor Appointments & Escorts    |  |
|  | - High-Contrast OLED/Gold Mode   |     | - Proactive Outbox Inspector       |  |
|  | - 1-Tap "I Took This" & SOS      |     | - Security Audit Log Viewer        |  |
|  +----------------------------------+     +------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST API (Zod Validated)
+------------------------------------------v----------------------------------------+
|                               API & SERVICE LAYER                                 |
|  +----------------------+ +-----------------------+ +--------------------------+  |
|  |     AuthService      | |   AdherenceService    | |    MedicationService     |  |
|  | - Salted Bcrypt PINs | | - Daily Schedule Calc | | - CRUD Operations        |  |
|  | - Rate Limiter (5x)  | | - Missed Dose Detect  | | - Refill Inventory Track |  |
|  | - JWT Session Tokens | | - Compliance Metrics  | | - Schedule Rules         |  |
|  +----------------------+ +-----------------------+ +--------------------------+  |
|  +----------------------+ +-----------------------+ +--------------------------+  |
|  |  AppointmentService  | |     EmailService      | |      GeminiService       |  |
|  | - Appointment CRUD   | | - Proactive Reminders | | - Gemini 3.5 Flash SDK   |  |
|  | - Escort Assignment  | | - 30m Overdue Alert   | | - Multimodal Scanner     |  |
|  | - Pre-visit Questions| | - Outbox Persistence  | | - Interaction Engine     |  |
|  +----------------------+ +-----------------------+ +--------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | ACID Transactions / In-Memory Index
+------------------------------------------v----------------------------------------+
|                              PERSISTENCE LAYER                                    |
|   +---------------------------------------------------------------------------+   |
|   |   ACID-Compliant JSON Store with In-Memory Caching & Atomic Writes        |   |
|   |   - Profiles & Members     - Active Medications    - Dose Logs            |   |
|   |   - Appointments           - Dispatched Emails     - Immutable Audit Trail|   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 1. Domain Entities & Database Schema

The platform's data models are located in `src/lib/types/index.ts`:

1. **`CareCircleProfile`**: Central entity representing the elderly individual. Contains medical conditions, known allergies, emergency contacts, and salted bcrypt hashes for each role's PIN.
2. **`CareCircleMember`**: Represents individuals in the care circle (`ELDER`, `PRIMARY_CAREGIVER`, `FAMILY_MEMBER`, `CLINICIAN`) with role-based permissions (`canEditMeds`, `receiveMissedAlerts`, etc.).
3. **`Medication`**: Clinical medication records containing dosage, form (tablet, capsule, liquid, etc.), color, shape, food requirements (`WITH_FOOD`, `BEFORE_MEAL`, etc.), frequency, scheduled daily times (24-hr format), and pill count refill thresholds.
4. **`DoseLog`**: Daily scheduled doses generated for each active medication, tracking adherence status (`TAKEN`, `SKIPPED`, `SNOOZED`, `MISSED`, `PENDING`), actual administration timestamp, and actor role.
5. **`DoctorAppointment`**: Scheduled consultations with medical specialty, clinic location, contact phone, designated family escort/driver, and AI pre-visit consultation questions.
6. **`DispatchedEmail`**: Persistent outbox records tracking proactive email alerts sent to guardians, including rendered HTML bodies and delivery status.
7. **`AuditLog`**: Append-only security audit log recording every mutation, authentication event, dose action, and emergency SOS broadcast.

---

## 2. GenAI Integration (Gemini 3.5 Flash)

Google's official GenAI SDK (`@google/genai`) is integrated strictly with the requested model: `gemini-3.5-flash`:

* **Multi-Modal Image Understanding:** Processes photo uploads or camera frames of prescriptions and pill labels. Generates structured JSON adhering to clinical schema standards.
* **Clinical Safety & Interaction Intelligence:** Evaluates active medications for drug-drug interactions and dietary contraindications (e.g., grapefruit, salt substitutes, calcium, NSAIDs), returning severity ratings, pharmacological mechanisms, and actionable caregiver instructions.
* **Conversational Health Companion ("Amity"):** Provides a gentle, high-clarity voice assistant for daily wellness check-ins, assessing symptoms and producing a caregiver digest note for family members.
* **Pre-Visit Clinical Questions Generator:** Cross-references the patient's condition, medications, and recent adherence to synthesize high-yield consultation questions for doctor visits.
* **Deterministic Fallback Engine:** Guarantees 100% reliable functionality and instant responses in environments where `GEMINI_API_KEY` is not yet configured or during offline evaluation.

---

## 3. Proactive Email Engine & Scheduler

The notification engine (`src/lib/services/email.service.ts`) executes an autonomous evaluation loop that can be triggered in the background or via `POST /api/scheduler/tick`:

1. **Upcoming Dose Reminders:** Scans for pending doses scheduled within the next 30 minutes. Emails the elder and primary caregiver with pill appearance guides.
2. **Missed Dose Escalation:** Checks for pending doses exceeding their scheduled time by $> 30$ minutes. Flags the dose as `MISSED` and immediately dispatches an urgent escalation email to all family members with quick-dial contact buttons.
3. **Doctor Visit Reminders:** Automatically sends a 24-hour preparatory alert and a 2-hour departure alert including clinic address and assigned driver.
4. **Low Supply Refill Alerts:** Triggers an alert to the primary caregiver when `pillCountCurrent <= pillCountRefillThreshold`.
5. **Emergency SOS Alerts:** Instantly broadcasts an emergency notification to all registered care circle contacts.
