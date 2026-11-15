# REST API Documentation

All API endpoints accept and return JSON. Endpoints are strictly validated using Zod schemas.

---

### Authentication & Sessions

#### `POST /api/auth/login`
Verifies Care Circle passcode and issues a signed JWT session cookie.
* **Payload:**
  ```json
  {
    "profileId": "profile_eleanor_vance_01",
    "passcode": "1122"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "role": "ELDER",
    "member": { "id": "member_eleanor", "name": "Eleanor Vance" },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```
* **Rate Limiting:** Maximum 5 failed attempts within 5 minutes per IP.

#### `GET /api/auth/session`
Returns the active session user, profile, circle members, and suggested demo PINs.

---

### Medication Management

#### `GET /api/medications`
Retrieves medications for a profile.
* **Query Parameters:**
  * `profileId` (optional): Defaults to primary elder profile.
  * `activeOnly` (optional, boolean): If `true`, returns only active prescriptions.

#### `POST /api/medications`
Adds a new medication schedule.
* **Payload:**
  ```json
  {
    "name": "Lisinopril",
    "dosage": "10 mg",
    "form": "TABLET",
    "color": "#f87171",
    "shape": "Round tablet",
    "instructions": "Take 1 tablet every morning with water.",
    "purpose": "Blood pressure control",
    "foodRequirement": "NO_RESTRICTION",
    "frequency": "DAILY",
    "scheduledTimes": ["08:00"],
    "pillCountCurrent": 30,
    "pillCountRefillThreshold": 7,
    "prescribedBy": "Dr. Evelyn Reed, MD"
  }
  ```

#### `PUT /api/medications`
Updates an existing medication or adjusts pill count refills.

#### `DELETE /api/medications?id={medId}`
Removes a medication and logs an audit record.

---

### Adherence Tracking

#### `GET /api/adherence`
Returns the daily dose timeline and adherence statistics.
* **Query Parameters:** `date` (optional, `YYYY-MM-DD`).
* **Response:**
  ```json
  {
    "date": "2026-11-15",
    "doses": [...],
    "stats": {
      "todayComplianceRate": 100,
      "sevenDayComplianceRate": 95,
      "totalDosesScheduledToday": 4,
      "dosesTakenToday": 2,
      "dosesSkippedToday": 0,
      "dosesMissedToday": 0,
      "currentStreakDays": 14
    }
  }
  ```

#### `POST /api/adherence`
Records an action on a dose (`TAKEN`, `SKIPPED`, `SNOOZED`).
* **Payload:**
  ```json
  {
    "doseId": "dose_med_lisinopril_2026-11-15_08:00",
    "action": "TAKEN",
    "actorName": "Eleanor Vance",
    "actorRole": "ELDER"
  }
  ```

---

### Doctor Appointments

#### `GET /api/appointments`
Returns doctor appointments ordered chronologically.

#### `POST /api/appointments`
Schedules a new doctor appointment with escort assignment and pre-visit questions.

#### `PUT /api/appointments`
Updates appointment details or post-visit doctor notes.

#### `DELETE /api/appointments?id={aptId}`
Cancels an appointment.

---

### Proactive Notification & Scheduler

#### `POST /api/scheduler/tick`
Evaluates care circle rules, detects overdue medications, upcoming doses, and doctor appointments, dispatching proactive emails.
* **Response:**
  ```json
  {
    "success": true,
    "dispatched": {
      "upcomingDoseEmailsSent": 0,
      "missedDoseEmailsSent": 0,
      "appointmentEmailsSent": 1,
      "refillEmailsSent": 0
    }
  }
  ```

#### `GET /api/outbox`
Lists all dispatched emails with status, subject, recipient, and rendered HTML body.

---

### Gemini 3.5 Flash Intelligence Endpoints

#### `POST /api/gemini/scan-prescription`
Accepts a base64-encoded prescription image and extracts structured medication fields.

#### `GET /api/gemini/interactions`
Cross-analyzes all active prescriptions and dietary factors for dangerous contraindications.

#### `POST /api/gemini/companion`
Handles conversational elder check-ins, evaluates emotional state, detects symptoms, and produces caregiver notes.

#### `POST /api/gemini/appointment-prep`
Synthesizes recent adherence and medication data into high-yield clinical questions for the doctor visit.

---

### Emergency SOS

#### `POST /api/sos`
Immediately broadcasts emergency alert emails to all care circle contacts.

---

### Security Audit Trail

#### `GET /api/audit`
Returns the immutable security audit log of all system mutations and authentication events.
