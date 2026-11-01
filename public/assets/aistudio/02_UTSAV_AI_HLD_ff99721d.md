# UTSAV AI — High-Level Design (HLD)
Version 1.0 · 31 October 2026

## Architecture decision
**Phase 1**: Google AI Studio Build mode generates React + TypeScript UI and deterministic mock service adapters (no external credentials or cloud setup). **Phases 2+**: add Firebase Authentication, Cloud Firestore, server-side Gemini orchestration through a Node.js/TypeScript backend on Cloud Run, Google Places for vendor discovery and optional Cloud Storage/Tasks/Scheduler.

```text
Responsive React Application
  Landing / Onboarding / My Events / Dashboard
  Budget Studio / Checklist / Timeline
  Vendor Hub / Inspiration / Team / Copilot Drawer
               |
        Typed Service Interfaces
               |
       Phase 1 Mock Adapters
               |
   Phase 2+ Cloud Run Backend API
      |        |         |        |
   Event     Budget     Task     Change Proposal
   Service   Engine     Engine   Approval Service
      |        |         |        |
      +------ Firestore --+        |
             Gemini AI Orchestrator (schema outputs and tool calls)
             Pricing evidence / Vendor quotes
             Places API (discovery, not quotes)
             Cloud Storage (files, optional)
             Scheduler / Tasks (later reminders)
```

## Google components
- AI Studio Build: prompt-driven full-stack workspace, UI generation, iteration and source sync.
- Gemini API: intake, intent understanding, granular task ideas, budget explanations, quote comparisons and re-plan recommendations; not money arithmetic or unilateral mutations.
- Firebase Authentication: real identity later.
- Cloud Firestore: event data and task/budget/quote/proposal collections later.
- Cloud Run: secure server orchestration and validated tool execution.
- Google Maps Places API: geo-aware vendor discovery; no verified rate or availability guarantees.
- Storage: vendor docs/images; Scheduler/Tasks: reminders later.

## Frontend modules
`src/app`, `src/components`, `src/features/events`, `budget`, `checklist`, `timeline`, `vendors`, `inspiration`, `team`, `copilot`, `src/domain`, `src/data/demo`, `src/services`, `src/state`, `src/styles`.
Service interfaces: `EventRepository`, `BudgetService`, `TaskService`, `VendorService`, `CopilotService`; provide mock implementations for Phase 1.

## Data model
- `Event`: id, ownerId, name, type, city, eventDate?, guestCount, currency, totalBudget, tier, foodPreference, functionCount, inclusions, version.
- `BudgetCategory`: eventId, category, allocated, estimatedLow/Base/High, committed, actual, paid, sourceReferenceIds.
- `PricingEvidence`: region, service, unit, priceRange, sourceType, url?, capturedAt?, validity?, confidence, inclusions.
- `VendorQuote`: vendorId, quoteId, currency, chargeBasis, rate, quantity, tax, extras, guaranteedCount?, inclusions, exclusions, validUntil?, status.
- `Task`: id, eventId, parentId?, categoryId, title, ownerId?, dueDate?, relativeDays?, status, priority, dependsOnIds[], estimatedCost?, linkedBudgetCategoryId?.
- `EventMember`: userId, eventId, role; `ChangeProposal`: eventId, basedOnVersion, scenario, before/after, affectedTaskIds, status and audit metadata.

## Example Firestore layout (future)
```text
users/{uid}
events/{eventId}
events/{eventId}/members/{uid}
events/{eventId}/budgetCategories/{categoryId}
events/{eventId}/taskCategories/{categoryId}
events/{eventId}/tasks/{taskId}
events/{eventId}/vendors/{vendorId}
events/{eventId}/quotes/{quoteId}
events/{eventId}/changeProposals/{proposalId}
pricingReferences/{referenceId}
eventTemplates/{templateId}
```

## Budget calculation rules
`catering = chargeablePlates * plateRate + specifiedExtras + applicableTaxes - alreadyIncludedCharges`; never assume guests always equal guaranteed plates. Store verified committed amounts separately from estimates. Budget allocations including reserve must equal event total. Demo: 200×900+20000=₹200000; 250×900+20000=₹245000; reserve ₹180000→₹135000 if ₹45000 approved from reserve. Use integer paise/precise decimal in production, not floating point for payment-grade calculations.

## Checklist rules
Task hierarchy event/category/subcategory/task/subtask; no cycles or duplicate IDs. Dependencies drive blocked and late warnings; unknown event date uses relative milestones. Distinct template packs for wedding, birthday, community. Completion does not imply payment. Cost-related checklist tasks link to budget entries but do not auto-commit expense.

## Gemini orchestration (future)
Extract structured intent → read event with version → call safe deterministic tools → create grounded narrative and change proposal → show before/after → obtain user confirmation → backend verifies authorization, invariants and version → apply transactionally/idempotently → audit and update UI. LLM cannot book vendors, pay money, reassign committed budget or send invitations without approval. Validate even schema-conforming AI outputs.

## Planned API contracts
- `POST /api/events`, `GET /api/events/:id`
- `POST /api/events/:id/budget/estimate`
- `GET /api/events/:id/tasks`, `POST /api/events/:id/tasks`
- `POST /api/events/:id/quotes`
- `POST /api/events/:id/copilot/message`
- `POST /api/events/:id/change-proposals/:id/approve`
- `GET /api/events/:id/overview`
All protected with Firebase ID token verification and event membership checks in real phases.

## Nonfunctional design
Mobile-first and WCAG-minded controls, Indian currency/date locale, secrets server-side, security rules and role-based access, durable change log, price provenance, graceful error/empty/loading states. Phase 1 offers localStorage demo persistence plus Reset Demo control. Neither mock AI nor sample vendors should masquerade as live integrations.

## Development phases
1 UI prototype → 2 Firebase foundation → 3 Gemini event architect → 4 evidence-aware budget engine → 5 granular task intelligence → 6 approval-gated re-planning → 7 vendors, inspiration, export, reminders and polish.
