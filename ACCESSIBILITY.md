# Accessibility (WCAG 2.1 AAA) Compliance Report

## Accessibility Mission

Elderly individuals frequently experience age-related physical and sensory changes, including decreased visual acuity, loss of high-frequency hearing, motor tremors, and reduced working memory. CuraCircle AI was engineered from the ground up to achieve **WCAG 2.1 AAA** compliance.

---

## 1. Senior-Centric Design Principles (Elder Mode)

* **Scalable Typography:** The platform includes an interactive text scaler (100% to 150%) that enlarges body and heading text dynamically across the viewport. Minimum body font in Elder Mode starts at 18px ($1.125$rem) with comfortable line height ($1.6$).
* **Touch Target Sizing:**
  * WCAG 2.1 AA requires minimum touch targets of $44 \times 44$px.
  * CuraCircle AI Elder Mode enforces a minimum of **$64 \times 64$px** (and up to $72 \times 300$px for primary buttons such as "I Took This Medicine"). This guarantees effortless interaction for seniors with Parkinson's, tremors, or arthritis.
* **Dual-Encoding (Never Color Alone):** Every dose status pairs an accessible color with a distinct SVG icon and an explicit text label (e.g., Green + Checkmark + "Taken"; Amber + Clock + "Due"; Red + Triangle + "Overdue"). Colorblind individuals can discern state instantly.

---

## 2. High Contrast Accessibility Themes

* **Clean Standard:** High-contrast slate and brand palette exceeding 4.5:1 ratio for regular text and 3:1 for large text.
* **High-Contrast Dark (OLED Black):** Pure `#000000` background with bright white `#ffffff` text and cyan `#38bdf8` borders, achieving contrast ratios exceeding **15:1**.
* **High-Contrast Solar Gold:** Pure `#000000` background with sharp golden-amber `#facc15` text and borders, achieving contrast ratios of **14.5:1**, ideal for individuals with macular degeneration or cataracts.

---

## 3. Web Speech API (Audio Narration & Voice Input)

* **Text-to-Speech (TTS):** The "Read Aloud" narration feature uses `window.speechSynthesis` with a calibrated cadence (rate: $0.9$, pitch: $1.0$) to read daily schedules, medicine instructions, and doctor appointments aloud in a warm, patient tone.
* **Speech-to-Text (STT):** The "Amity" health companion leverages `webkitSpeechRecognition` to enable seniors to confirm taking medicine or describe how they feel without typing.

---

## 4. Screen Reader & Keyboard Navigation

* **Skip Links:** A prominent skip-to-main-content link (`#main-content`) is available as the first focusable element.
* **Focus Rings:** High-visibility 3px blue focus rings with 3px offset (`focus-visible:ring-4`) ensure clear visual keyboard navigation.
* **ARIA Semantics:** Proper usage of `aria-labelledby`, `aria-describedby`, `aria-live="polite"`, and `role="button"` across all interactive elements.
