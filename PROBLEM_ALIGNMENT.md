# Problem Statement Alignment — CuraCircle AI

## 1. Problem Definition
Elderly individuals managing multiple chronic conditions struggle with complex medication routines, missed doses, and doctor consultations. At the same time, family members and caretakers need real-time, non-intrusive visibility into adherence while keeping the senior empowered and at the center of their own care decisions.

---

## 2. Feature-to-Requirement Mapping Matrix

| Problem Statement Requirement | CuraCircle AI Implementation | Source Location |
| :--- | :--- | :--- |
| **Shared Ecosystem** | Multi-role Care Circle connecting Elder, Primary Caregiver, Family Guardians, and Clinician. | [src/lib/types/index.ts](file:///c:/Catalyst%20Promptwar/src/lib/types/index.ts) |
| **Passcode-Based Access** | 10-round salted bcrypt hashed PINs for Elder (`1122`), Caregiver (`4321`), and Family (`5678`) with sliding-window rate limiting. | [src/lib/services/auth.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/auth.service.ts)<br>[PasscodeModal.tsx](file:///c:/Catalyst%20Promptwar/src/components/PasscodeModal.tsx) |
| **Manage Medication Schedules** | View, add, edit, and delete medications with form, dosage, frequency, food requirements, multiple 24h times, and refill tracking. | [src/lib/services/medication.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/medication.service.ts)<br>[MedicationModal.tsx](file:///c:/Catalyst%20Promptwar/src/components/MedicationModal.tsx) |
| **Track Adherence** | 1-Tap "I Took This Medicine", "Skip with Reason", "Remind in 15m". Live compliance gauges, 7-day adherence trends, and streak tracking. | [src/lib/services/adherence.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/adherence.service.ts) |
| **Doctor Appointments** | Track upcoming visits, specialty, clinic location, contact phone, and assigned family escorts (e.g., *"Sarah Vance driving"*). | [src/lib/services/appointment.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/appointment.service.ts)<br>[AppointmentsModal.tsx](file:///c:/Catalyst%20Promptwar/src/components/AppointmentsModal.tsx) |
| **Proactive Missed Dose Reminders** | Overdue doses ($> 30$ mins) automatically trigger urgent escalation emails to all family guardians with quick-dial phone links. | [src/lib/services/email.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/email.service.ts) |
| **Proactive Upcoming Dose Reminders** | Proactively sends email reminders 15–30 minutes before scheduled doses with pill appearance guides. | [src/lib/services/email.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/email.service.ts) |
| **Proactive Appointment Reminders** | Automatically dispatches 24-hour and 2-hour pre-visit alerts with clinic directions and escort checklist. | [src/lib/services/email.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/email.service.ts) |
| **Go Beyond Basic Reminders (Innovations)** | 1. Multimodal Prescription Scanner (Gemini 3.5 Flash)<br>2. Drug-Drug & Food Safety Center (Gemini 3.5 Flash)<br>3. "Amity" Voice Health Companion (Gemini 3.5 Flash + Web Speech API)<br>4. AI Doctor Visit Consultation Prep (Gemini 3.5 Flash)<br>5. WCAG 2.1 AAA Accessibility Kiosk Mode<br>6. Immutable Security Audit Trail | [src/lib/services/gemini.service.ts](file:///c:/Catalyst%20Promptwar/src/lib/services/gemini.service.ts)<br>[ElderMode.tsx](file:///c:/Catalyst%20Promptwar/src/components/ElderMode.tsx) |
| **Centering the Elder** | Senior Kiosk View puts the elderly individual in full control of their daily routine with large buttons, high-contrast themes, voice readout, and emergency SOS. | [ElderMode.tsx](file:///c:/Catalyst%20Promptwar/src/components/ElderMode.tsx) |
