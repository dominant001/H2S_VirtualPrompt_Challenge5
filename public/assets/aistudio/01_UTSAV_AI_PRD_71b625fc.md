# UTSAV AI — Product Requirements Document (PRD)
Version 1.0 · 31 October 2026 · UI-first prototype baseline

## Product vision
**Utsav AI — You celebrate. We plan.** A mobile-first GenAI event planning copilot for Indian weddings, birthdays and community events. Users describe their event, receive an editable budget and detailed timeline/checklist, coordinate family members and vendors, and approve AI-proposed adjustments when plans change.

## Users and jobs
- Families planning multi-task weddings without a professional planner.
- Parents organizing birthdays.
- Community organizers managing venues, volunteers, safety, permissions and sponsors.
- Jobs: know what to plan, how much to allocate, what is pending, who owns it, and how changes affect spending and deadlines.

## Core differentiators
1. Location-aware budget estimates with sources, confidence and contingency, not fabricated vendor prices.
2. Hierarchical checklist: Event → Category → Subcategory → Task → Subtask.
3. Gemini-guided change-impact analysis: proposed adjustments synchronize budgets, task lists and vendor requirements with user approval.

## MVP modules and requirements
### 1. AI Event Architect
Onboarding captures event type, name, city, tentative/exact date, guest count, budget, food type, tier, number of functions, accommodation, theme/traditions and preferences. Missing information is requested progressively. Shows assumptions. User confirms creation.

### 2. Intelligent Budget Manager
Maintain `allocated`, `estimatedLow/Base/High`, `committed`, `paid`, `actual`, `remaining`, `contingency`, plus pricing `sourceType`, `sourceUrl`, `observedAt`, `confidence`, `inclusions` and `exclusions`. Sum of category allocations (including contingency) must equal total budget. Detect double-counted bundled services and tax/service exclusions. Market figures are labeled modelled/public/quoted/verified/contracted; never pass an illustrative price as a vendor offer. Deterministic calculation, AI explanation.

### 3. Checklist and Timeline
Provide weddings, birthdays and community template packs with editable categories. Wedding categories Groom, Bride, Invitations, Venue, Catering, Decor, Photography, Guests, Rituals, Finance, Event Day. Groom includes outfit selection, measurements, tailor, trial/final fittings, shoes, grooming, wedding car, invitations and groom-side relatives. Invitations: guest list → design → proof → printing → pickup → distribution → RSVP. Tasks have owner, due date or relative offset, priority, status, dependencies, notes and optional budget link. Timeline supports filters, milestones and overdue states; missing exact dates must not be fabricated.

### 4. Vendor Assistant
Initially sample listing and manual quote comparison. Later Google Places for discovery, user-entered or verified vendor pricing for estimates, with validity dates and package inclusions. No fake booking status or guaranteed availability.

### 5. Inspiration Studio
Theme moodboards, color palettes, personalized ideas, invitation copy and printable event plan. AI image generation and voice invitations are later enhancements. Inspiration is not a guarantee of price feasibility.

### 6. Collaboration
Assigned tasks, owner views, progress rollups and responsibilities. Real login and sharing after UI phase.

### 7. AI Re-planning (cross-cutting)
A change to guests, budget, vendor quote, dates or venue creates an impact preview. Calculate affected amounts and tasks, show alternatives, obtain explicit approval, then apply as a transaction. Never auto-spend contingency or change booked contracts.

## Demo seed: Jaipur wedding
Event: Aarav & Meera’s Wedding, Jaipur, 200 guests, vegetarian, standard service, one main function, ₹12,00,000 total; date **not specified**.

| Category | Illustrative allocation |
|---|---:|
| Venue | ₹3,00,000 |
| Catering | ₹2,00,000 |
| Decor | ₹1,30,000 |
| Photography and Video | ₹1,00,000 |
| Outfits and Grooming | ₹1,10,000 |
| Invitations | ₹30,000 |
| Transport | ₹45,000 |
| Rituals and Miscellaneous | ₹1,05,000 |
| Contingency Reserve | ₹1,80,000 |
| **Total** | **₹12,00,000** |

Sample catering: 200 chargeable plates × **sample** ₹900 + **sample** ₹20,000 extras = ₹2,00,000. For 250 guests, 250×₹900+₹20,000=₹2,45,000, an increase of ₹45,000. If user approves paying overrun from reserve, reserve becomes ₹1,35,000, total stays ₹12 lakh. Explicitly label **illustrative/demo-only**, not verified Jaipur rates.

## End-to-end user journeys
- Landing → event creation wizard → review assumptions → dashboard.
- Dashboard → Budget Studio → category detail → cost simulation → proposal preview.
- Checklist → Groom → Outfit → complete/assign task → progress updates.
- Copilot → “increase 200 guests to 250 without raising budget” → impact → reserve/reallocate/compare → approve/reject.
- Vendor Hub → add a manually entered quotation → compare with category estimate.
- My Events → create/switch wedding, birthday or community templates.

## UI-first scope (Phase 1)
Create navigable and locally interactive screens for Landing, My Events, Onboarding, Dashboard, Budget Studio, Checklist, Timeline, Vendor Hub, Inspiration Studio, Team, Copilot and Settings. Use mock services/state, no real Google APIs yet. Clearly mark demo data and mock AI responses.

## Later scope
Firebase Auth and Firestore; server-side Gemini with structured outputs/function calling; budget engine, real templates, approval API; Maps/Places vendor discovery; quotation PDF extraction; image/TTS, Google Calendar/reminders, PDF export and multilingual voice. No direct payments or bookings in MVP.

## Functional acceptance criteria
1. Budget allocations total exactly ₹12 lakh including ₹1.8 lakh reserve.
2. 200→250 guest change shows ₹45,000 catering impact and reserve ₹1.35 lakh upon approval; reject does not change state.
3. Task completion updates category/global progress; editing, filtering, assignment and search work.
4. Invitation dependencies appear correctly.
5. User can create and switch among event types; templates vary.
6. No buttons that imply an action but do nothing; clear demo labels on mock services/data.
7. Responsive at 360px and desktop, keyboard accessible, INR Indian grouping, date-not-known handled.
8. Never claim live/verified vendor prices, confirmed booking, cloud persistence or Gemini reasoning in Phase 1.

## Nonfunctional and security
Typed domain models, reusable components, accessible UX, localization-ready labels, mobile-first, no secrets in client code. Later: Firebase rules, backend authorization, approval audit trail, version checks, idempotent changes, paise/decimal arithmetic, data minimization and secure quote storage.

## Inspiration from reference repo
Adopt modular specialist workflows, event-specific schedules, decor/invitation idea generation and export concepts from `atef-ataya/ai-event-planner`; avoid its hardcoded venue/catering prices as authoritative and its simple event-day schedule as a full wedding checklist.
