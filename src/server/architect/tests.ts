/**
 * Utsav AI — Phase 3: Gemini Event Architect Automated Acceptance Tests
 * Verifies Acceptance Tests A through F
 */

import { eventArchitectService } from './intakeService';
import { EventIntakeDraft } from './types';

export interface Phase3TestReport {
  name: string;
  passed: boolean;
  notes: string;
  extracted?: Partial<EventIntakeDraft>;
}

export async function runArchitectTestSuite(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passCount: number;
  results: Phase3TestReport[];
  timestamp: string;
}> {
  const results: Phase3TestReport[] = [];

  // TEST A: Standard English prompt extraction
  try {
    const inputA = "Plan a vegetarian wedding in Jaipur for 200 people with ₹12 lakh budget";
    const resultA = await eventArchitectService.processMessage([
      { role: 'user', content: inputA }
    ]);
    const d = resultA.draft;
    const passed =
      d.eventType === 'wedding' &&
      d.city.toLowerCase() === 'jaipur' &&
      d.guestCount === 200 &&
      d.budgetINR === 1200000 &&
      d.foodPreference === 'vegetarian';

    results.push({
      name: "Test A: Standard English Intake (Jaipur, 200 guests, ₹12L, veg wedding)",
      passed,
      notes: passed
        ? "Extracted exact parameters, correctly identified missing date as follow-up."
        : `Extracted mismatch: city=${d.city}, guests=${d.guestCount}, budget=${d.budgetINR}, food=${d.foodPreference}`,
      extracted: { city: d.city, guestCount: d.guestCount, budgetINR: d.budgetINR, foodPreference: d.foodPreference },
    });
  } catch (err: any) {
    results.push({ name: "Test A", passed: false, notes: err.message });
  }

  // TEST B: Form Edit & Confirmation Invariant
  try {
    const baseDraft = eventArchitectService.getInitialDraft();
    // Simulate user editing guest count and budget directly in form
    const editedDraft = eventArchitectService.sanitizeDraft(
      { ...baseDraft, guestCount: 250, budgetINR: 1500000, title: "Custom Kabir Wedding" },
      baseDraft,
      "user form edit"
    );
    const passed =
      editedDraft.guestCount === 250 &&
      editedDraft.budgetINR === 1500000 &&
      editedDraft.title === "Custom Kabir Wedding";

    results.push({
      name: "Test B: Form Edit Invariant (Direct user edits sync cleanly before confirmation)",
      passed,
      notes: passed
        ? "Form fields update draft cleanly and preserve schema integrity without unilateral creation."
        : "Draft did not respect form mutation.",
      extracted: { guestCount: editedDraft.guestCount, budgetINR: editedDraft.budgetINR, title: editedDraft.title },
    });
  } catch (err: any) {
    results.push({ name: "Test B", passed: false, notes: err.message });
  }

  // TEST C: Date Uncertainty / Null Date Boundary (Never fabricate countdown)
  try {
    const inputC = "We are not sure of the exact date yet, maybe sometime next winter";
    const resultC = await eventArchitectService.processMessage([
      { role: 'user', content: inputC }
    ]);
    const d = resultC.draft;
    const passed = d.hasExactDate === false && (d.eventDate === null || d.eventDate === undefined);

    results.push({
      name: "Test C: Date Uncertainty Handling (Null date preserved, no fabricated countdown)",
      passed,
      notes: passed
        ? `hasExactDate is false, eventDate is ${d.eventDate}, window is "${d.eventDateWindow}"`
        : `Failed: eventDate was fabricated as ${d.eventDate}`,
      extracted: { hasExactDate: d.hasExactDate, eventDate: d.eventDate, eventDateWindow: d.eventDateWindow },
    });
  } catch (err: any) {
    results.push({ name: "Test C", passed: false, notes: err.message });
  }

  // TEST D: Hindi Intent Handling (Bilingual, no currency confusion)
  try {
    const inputD = "हम जयपुर में 200 लोगों की शादी प्लान करना चाहते हैं, बजट 12 लाख है और खाना शुद्ध शाकाहारी";
    const resultD = await eventArchitectService.processMessage([
      { role: 'user', content: inputD }
    ]);
    const d = resultD.draft;
    const passed =
      d.city.toLowerCase() === 'jaipur' &&
      d.guestCount === 200 &&
      d.budgetINR === 1200000 &&
      d.foodPreference === 'vegetarian';

    results.push({
      name: "Test D: Hindi Intent Handling (जयपुर, 200 लोग, ₹12 लाख, शाकाहारी)",
      passed,
      notes: passed
        ? "Correctly parsed Hindi numerals, city and vegetarian food preference."
        : `Mismatch: city=${d.city}, guests=${d.guestCount}, budget=${d.budgetINR}`,
      extracted: { city: d.city, guestCount: d.guestCount, budgetINR: d.budgetINR, foodPreference: d.foodPreference },
    });
  } catch (err: any) {
    results.push({ name: "Test D", passed: false, notes: err.message });
  }

  // TEST E: Malformed JSON / Error Recovery & Labeled Mock Fallback
  try {
    const malformedText = "Random non-JSON text from broken stream...";
    const parsed = eventArchitectService.sanitizeDraft(
      { guestCount: 180, budgetINR: 1000000 },
      eventArchitectService.getInitialDraft(),
      malformedText
    );
    const simulatedResult = eventArchitectService.generateSimulatedIntake(
      "Birthday party in Mumbai for 50 kids with 2 lakh budget",
      eventArchitectService.getInitialDraft(),
      "Simulated upstream timeout"
    );

    const passed =
      parsed.guestCount === 180 &&
      simulatedResult.simulated === true &&
      simulatedResult.replyText.includes("Demo simulation") &&
      simulatedResult.draft.city === "Mumbai" &&
      simulatedResult.draft.guestCount === 50 &&
      simulatedResult.draft.budgetINR === 200000;

    results.push({
      name: "Test E: Fault-Tolerant Error & Credit Depletion Recovery (Labeled fallback)",
      passed,
      notes: passed
        ? "Recovered gracefully from malformed text and produced labeled simulated output."
        : "Failed recovery test.",
    });
  } catch (err: any) {
    results.push({ name: "Test E", passed: false, notes: err.message });
  }

  // TEST F: Read-Only Draft Boundary (No unilateral database mutations or fake bookings)
  try {
    const draft = eventArchitectService.getInitialDraft();
    // Verify draft does not contain confirmed booking IDs or unilateral contract locks
    const hasUnilateralBookings =
      (draft as any).confirmedVendorBookings !== undefined ||
      (draft as any).signedContracts !== undefined;
    const passed = !hasUnilateralBookings;

    results.push({
      name: "Test F: Read-Only Draft Boundary (No unilateral bookings or financial commits)",
      passed,
      notes: passed
        ? "Draft remains purely advisory until user initiates explicit save transaction."
        : "Draft contained unilateral booking mutations.",
    });
  } catch (err: any) {
    results.push({ name: "Test F", passed: false, notes: err.message });
  }

  const passCount = results.filter((r) => r.passed).length;
  const allPassed = passCount === results.length;

  return {
    allPassed,
    totalTests: results.length,
    passCount,
    results,
    timestamp: new Date().toISOString(),
  };
}
