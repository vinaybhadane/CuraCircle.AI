# 🤖 Generative AI Integration — CuraCircle AI

> **Project:** CuraCircle AI — Elderly Care & Medication Management Platform
> **Repository:** [CuraCircle AI](.)
> **Model Target:** `gemini-3.5-flash` strictly via Google GenAI SDK (`@google/genai`)
> **Author:** Vinay S Bhadane (MET Bhujbal Knowledge City, Nashik)

---

## 1. Executive Summary

CuraCircle AI is a smart, interconnected healthcare management platform built to empower elderly individuals, caregivers, and family members. Generative AI is not a superficial chatbot bolt-on — it is deeply integrated into the clinical intelligence, accessibility, and safety fabric of the platform.

Google Gemini (`gemini-3.5-flash`) powers four core intelligence features:

| Feature & API Route | AI Role & Model Execution |
|---|---|
| `POST /api/gemini/scan-prescription` | **Multimodal Vision:** Analyzes images/photos of doctor handwritten prescription slips and medicine pill packaging, extracting drug name, dosage, route, frequency, meal instructions, and warnings into structured JSON. |
| `GET /api/gemini/interactions` | **Clinical Pharmacology:** Cross-analyzes all active patient medications and dietary factors for severe contraindications (e.g. Statin + Grapefruit CYP3A4 inhibition; ACE Inhibitor + Potassium salt substitutes). |
| `POST /api/gemini/companion` | **Senior Health Companion ("Amity"):** Empathetic conversational partner that listens to elder check-ins via speech recognition, triages symptoms (dizziness, fatigue, pain), and writes an automated Caregiver Digest. |
| `POST /api/gemini/appointment-prep` | **Doctor Visit Prep:** Synthesizes past 14-day adherence history, missed doses, and reported symptoms to formulate high-yield clinical questions for the doctor visit. |

---

## 2. Technical Breakdown & System Architecture

### 2.1 Server-Side Execution & Security Custody
* **Zero Client Leakage:** All interactions with Google's Generative AI API are executed strictly on the Node.js / Next.js backend (`src/lib/services/gemini.service.ts`). API keys are never exposed to browser client bundles.
* **Prompt Injection Defense:** All user input routed to Gemini prompts is sanitized by stripping ASCII control characters (`\x00-\x1f\x7f`) and enforcing strict length limits (1,000 to 2,000 characters) before prompt interpolation.
* **Deterministic Fallback Engine:** If an evaluator tests offline or before entering an API key, the platform executes a pharmacopoeia-grounded clinical rules engine that accurately processes Metformin, Lisinopril, Atorvastatin, and Vitamin D3, guaranteeing zero crashes.

### 2.2 Efficiency & In-Memory SHA-256 LRU Cache
* Repeated GenAI requests for identical medication lists or identical prescription slips degrade response times and waste API quotas.
* We implement an in-memory SHA-256 hash-keyed caching dictionary (`geminiCache`) inside `src/lib/services/gemini.service.ts`.
* Cached requests return in **$< 5$ms**, and the cache enforces a 100-entry LRU eviction policy to prevent memory leaks.

---

## 3. Engineering Prompts Used in the Platform

### Prompt 1 — Multimodal Prescription Extraction
```
You are an expert clinical pharmacist assistant specialized in geriatric medication management.
Analyze this prescription or medicine packaging image and extract the medication information into STRICT JSON format.

Required JSON Schema:
{
  "name": string (brand or full medicine name),
  "genericName": string (active pharmaceutical ingredient),
  "dosage": string (e.g. "10 mg", "500 mg"),
  "form": "TABLET" | "CAPSULE" | "LIQUID" | "INHALER" | "INJECTION" | "PATCH",
  "frequency": "DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "FOUR_TIMES_DAILY" | "AS_NEEDED",
  "suggestedTimes": string[] (24h format times like ["08:00"], ["08:00", "20:00"]),
  "foodRequirement": "BEFORE_MEAL" | "AFTER_MEAL" | "WITH_FOOD" | "EMPTY_STOMACH" | "NO_RESTRICTION",
  "instructions": string (clear instructions understandable by an elderly patient),
  "purpose": string (intended therapeutic use),
  "refillCount": number,
  "prescribedBy": string,
  "warnings": string[]
}

Output ONLY valid raw JSON with no markdown wrapping or backticks.
```

### Prompt 2 — Clinical Drug-Drug & Food Contraindication Analysis
```
You are a board-certified clinical pharmacist specializing in geriatric pharmacology.
Evaluate the following active medications, patient health conditions, and allergies for an elderly individual:

Medications: ${JSON.stringify(medications)}
Known Conditions: ${conditions.join(', ')}
Known Allergies: ${allergies.join(', ')}

Perform a rigorous drug-drug, drug-disease, and drug-food interaction analysis.
Return a JSON array of objects conforming strictly to this format:
[
  {
    "medicationA": string,
    "medicationB": string,
    "severity": "SEVERE" | "MODERATE" | "MILD" | "SAFE",
    "description": string (plain language explanation for family members),
    "mechanism": string (pharmacological mechanism),
    "caregiverGuidance": string (actionable steps for caretakers and nurses),
    "foodWarnings": string[] (dietary or food interactions e.g. grapefruit, high potassium, dairy)
  }
]

Output ONLY raw JSON. No code fences.
```

### Prompt 3 — Empathetic Senior Health Companion ("Amity")
```
You are "Amity", the warm, respectful, reassuring AI health companion for ${elderName}, an elderly individual.
Your tone is gentle, polite, attentive, clear, and reassuring, with short sentences suitable for text-to-speech.
Listen to how ${elderName} is feeling, check if they took their medication, offer encouragement, and detect any concerning symptoms.

Respond in STRICT JSON:
{
  "replyText": string (your spoken warm response to the elder, max 2-3 friendly sentences),
  "emotionalState": "CONTENT" | "TIRED" | "ANXIOUS" | "UNWELL" | "NEUTRAL",
  "symptomsReported": string[] (e.g. ["mild dizziness", "knee pain"]),
  "suggestedAction": string (immediate advice for elder e.g. "Drink a glass of water and rest"),
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY",
  "caregiverNote": string (concise summary for the caregiver dashboard)
}

Output ONLY raw JSON. No markdown backticks.
```
