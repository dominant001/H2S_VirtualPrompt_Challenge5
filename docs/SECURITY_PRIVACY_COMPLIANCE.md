# Utsav AI — Security, Privacy, Observability & Compliance Specification

## 1. Environment & Architecture Configuration

### 1.1 Technology Stack & Google Cloud Services
- **Client Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Server Gateway**: Express on Node.js / Cloud Run (`0.0.0.0:3000`).
- **AI Integration**: `@google/genai` TypeScript SDK via server-side AI Usage Gateway (`aiUsageGateway`). Client code never directly contacts Gemini API endpoints or holds API keys.
- **Database & Auth**: Firebase Firestore and Firebase Authentication (`ai-studio-utsavai-5ee2195d-5a01-4554-a806-a394a5166eee`).
- **Maps & Discovery**: Google Places API (New Text Search) with official solution attribution identifier (`X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1`).
- **Document Export**: `jsPDF` client-side multi-page PDF generation engine with exact numeric precision and disclaimer banners.

### 1.2 Environment Variables (`.env.example`)
| Key | Exposure | Description |
|---|---|---|
| `GEMINI_API_KEY` | Server-Only | Required for Gemini generative workflows (`gemini-2.5-flash`). Injected at runtime via Secret Manager / environment. Never exposed to browser. |
| `APP_URL` | Server & Client | Cloud Run / Dev server origin URL for self-referential links, OAuth callbacks, and API routing. |
| `VITE_GOOGLE_MAPS_API_KEY` | Server / Client | Google Maps Platform API key with Places API (New) enabled. Used by server-side Places adapter for vendor discovery. |
| `PORT` | Server-Only | Listening port (`3000`). Dev server and container entrypoint listen on `0.0.0.0:3000`. |

---

## 2. Security Hardening & Zero-Trust Policies

### 2.1 Least Privilege & Cross-Account Isolation
- **Firestore Security Rules (`firestore.rules`)**:
  - Enforces authenticated session check (`isSignedIn()`).
  - Strict ownership match on all `/events/{eventId}` reads and writes: `resource.data.ownerId == request.auth.uid`.
  - Subcollections (`budgetCategories`, `tasks`, `quotes`, `timelines`, `changeProposals`) inherit strict membership and event owner verification.
  - Cross-account access to other celebration events is denied at the database rule level.
- **Backend API Authorization (`authService.ts`)**:
  - Validates `Authorization: Bearer <token>` on all mutation and execution endpoints.
  - Verifies event ownership on proposal approval and state modification: returns `403 Forbidden` if `event.ownerId !== userContext.userId` and the user is not in demo mode.

### 2.2 Security Response Headers
Configured on every HTTP response via server middleware:
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
- `Referrer-Policy: strict-origin-when-cross-origin` (protects query tokens)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (disables unused sensors)

### 2.3 AI Prompt Injection Defense & Untrusted Document Boundaries
- Vendor quote texts uploaded or pasted by users represent untrusted third-party inputs.
- All vendor quote documents are isolated within system boundary tags (`<<<UNTRUSTED_VENDOR_DOCUMENT>>>`).
- Explicit instructions command Gemini to ignore imperative prompt injection instructions (e.g. commands to automatically mark bookings as confirmed, bypass rate limits, or alter event budgets).
- Quotations extracted by Gemini produce structured preview proposals with confidence scores and source citations; they **never auto-confirm or modify contracts without human review**.

---

## 3. Financial Invariant & Arithmetic Integrity

1. **Integer / Decimal Precision Arithmetic**:
   - All financial operations use paise/rupee integer math without floating-point accumulation errors.
2. **Double-Counting Prevention**:
   - Venue rent and catering plate sub-charges are kept strictly isolated into separate budget categories (`cat-venue` vs `cat-catering`).
3. **Budget Allocation Invariant**:
   - The sum of all allocated categories plus contingency reserve must strictly equal `totalBudget` (`₹12,00,000`).
   - Increasing guest headcount (e.g. from 200 to 250 guests = +₹45,000 catering) re-balances the strategic contingency reserve from ₹1,80,000 down to ₹1,35,000, ensuring the ₹12L celebration ceiling is never breached without explicit user consent.
4. **Idempotent Change Proposals**:
   - Every proposal carries an `idempotencyKey` and `baseVersion`. Replay attempts or concurrent state conflicts are detected and rejected.

---

## 4. Observability & Monitoring

- **Structured API Audit Logs**:
  Every `/api/*` call is logged to stdout with structured JSON containing:
  `{ timestamp, requestId, method, path, statusCode, durationMs }`.
- **AI Usage Tracking & Cost Guard**:
  - `aiUsageTracker` records workflow name, model ID, input tokens, output tokens, latency, cost in USD, and cache hit status.
  - `costGuardService` enforces project-level budget ceilings ($10.00 USD safety limit) and feature-specific rate limits to prevent runaway spend.
  - Audit logs are inspectable in real-time in the UI under **System Controls &amp; AI Gateway**.

---

## 5. Privacy, Data Deletion & Open Source Compliance

### 5.1 Privacy Policy & Consumer Data Handling
- Utsav AI collects only celebration planning parameters (names, guest headcount, dietary preferences, dates, budget targets) strictly to generate planning recommendations.
- No guest personal phone numbers, emails, or credentials are used in generative LLM prompts without token minimization.
- Places search queries transmit only location (`Jaipur`), category (`Catering`), and radius, without consumer identity tags.

### 5.2 Data Deletion Plan (DPDP / GDPR)
- Event owners can delete celebration records at any time.
- Deleting an event triggers cascade removal of associated budget categories, task checklists, quotations, and change proposals.
- Audit logs retain only non-PII token counts and latency metrics.

### 5.3 Open-Source Software Notices (MIT License)
The application utilizes the following open-source dependencies under the MIT License:
- **React & ReactDOM**: Copyright (c) Meta Platforms, Inc.
- **Vite**: Copyright (c) 2019-present Evan You & Vite Contributors.
- **Lucide React**: Copyright (c) 2022 Lucide Contributors.
- **Tailwind CSS**: Copyright (c) Tailwind Labs, Inc.
- **jsPDF**: Copyright (c) 2010-2021 James Hall, https://github.com/MrRio/jsPDF.
