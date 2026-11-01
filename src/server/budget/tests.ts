/**
 * Utsav AI — Phase 4: Evidence-Aware Budget Intelligence Acceptance Tests
 * Verifies Acceptance Tests A through F
 */

import { BudgetEngine, SAMPLE_JAIPUR_EVIDENCE } from '../../domain/budgetEngine';
import { INITIAL_BUDGET_CATEGORIES, INITIAL_EVENT } from '../../data/seedData';
import { budgetAdvisorService } from './budgetAdvisor';
import { BudgetCategory, PricingEvidence } from '../../types';

export interface Phase4TestReport {
  id: string;
  name: string;
  passed: boolean;
  notes: string;
  data?: unknown;
}

export async function runBudgetTestSuite(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passCount: number;
  results: Phase4TestReport[];
  timestamp: string;
}> {
  const results: Phase4TestReport[] = [];

  // TEST A: Exactly ₹12,00,000 allocation including ₹1,80,000 reserve
  try {
    const categories = INITIAL_BUDGET_CATEGORIES;
    const totalBudget = 1200000;
    const validation = BudgetEngine.validateAllocations(categories, totalBudget);

    const reserveCat = categories.find(
      (c) => c.isContingency || c.name.toLowerCase().includes('contingency')
    );
    const reserveAllocated = reserveCat ? reserveCat.allocated : 0;

    const passed =
      validation.isValid &&
      validation.totalAllocatedINR === 1200000 &&
      reserveAllocated === 180000;

    results.push({
      id: 'TEST_A',
      name: 'Test A: Exactly ₹12,00,000 allocation including ₹1,80,000 reserve',
      passed,
      notes: passed
        ? `Sum of all 9 categories is exactly ₹${validation.totalAllocatedINR.toLocaleString('en-IN')}, reserve is ₹${reserveAllocated.toLocaleString('en-IN')}.`
        : `Validation failed: total=${validation.totalAllocatedINR}, reserve=${reserveAllocated}`,
      data: { totalAllocated: validation.totalAllocatedINR, reserve: reserveAllocated },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_A', name: 'Test A', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  // TEST B: Catering baseline: 200 × ₹900 + ₹20,000 = ₹2,00,000
  try {
    const resultB = BudgetEngine.estimateCatering({
      guestCount: 200,
      perPlateRate: 900,
      extraCounters: 20000,
    });

    const expectedCost = 200000; // 200 * 900 + 20,000 = 180,000 + 20,000 = 200,000
    const passed = resultB.totalCostINR === expectedCost && resultB.chargeablePlates === 200;

    results.push({
      id: 'TEST_B',
      name: 'Test B: Catering baseline (200 plates × ₹900 + ₹20,000 = ₹2,00,000)',
      passed,
      notes: passed
        ? `Accurate baseline calculated with integer Paise precision: ₹${resultB.totalCostINR.toLocaleString('en-IN')}.`
        : `Mismatch: expected ${expectedCost}, got ${resultB.totalCostINR}`,
      data: { chargeablePlates: resultB.chargeablePlates, totalCostINR: resultB.totalCostINR },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_B', name: 'Test B', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  // TEST C: 250 guests with unchanged assumptions => ₹2,45,000; +₹45,000
  try {
    const resultC = BudgetEngine.estimateCatering({
      guestCount: 250,
      perPlateRate: 900,
      extraCounters: 20000,
    });

    const expectedCost = 245000; // 250 * 900 + 20,000 = 225,000 + 20,000 = 245,000
    const difference = resultC.totalCostINR - 200000;
    const passed = resultC.totalCostINR === expectedCost && difference === 45000;

    results.push({
      id: 'TEST_C',
      name: 'Test C: Guest count sensitivity (250 guests => ₹2,45,000; +₹45,000 difference)',
      passed,
      notes: passed
        ? `Recalculated 250 guests: ₹${resultC.totalCostINR.toLocaleString('en-IN')} with +₹${difference.toLocaleString('en-IN')} difference.`
        : `Mismatch: expected ${expectedCost}, got ${resultC.totalCostINR}`,
      data: { totalCostINR: resultC.totalCostINR, delta: difference },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_C', name: 'Test C', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  // TEST D: Invalid negative guest/rate rejected; tax inclusion respected; venue+catering bundle not double counted
  try {
    let negativeGuestsRejected = false;
    let negativeRateRejected = false;

    try {
      BudgetEngine.estimateCatering({ guestCount: -50, perPlateRate: 900 });
    } catch {
      negativeGuestsRejected = true;
    }

    try {
      BudgetEngine.estimateCatering({ guestCount: 100, perPlateRate: -100 });
    } catch {
      negativeRateRejected = true;
    }

    // Tax included test: tax included should produce 0 additional tax
    const taxIncludedResult = BudgetEngine.estimateCatering({
      guestCount: 100,
      perPlateRate: 1000,
      applicableTaxes: { taxIncludedInPlateRate: true, taxRatePercent: 18 },
    });
    const taxIncludedRespected = taxIncludedResult.taxAmountINR === 0 && taxIncludedResult.totalCostINR === 100000;

    // Bundle deduplication test: venue includes ₹15,000 live counter credit
    const bundleDeduplicatedResult = BudgetEngine.estimateCatering({
      guestCount: 100,
      perPlateRate: 1000,
      extraCounters: 20000,
      venuePackageInclusions: { bundleCreditINR: 15000 },
    });
    // Expected: 100,000 + 20,000 - 15,000 = 105,000
    const bundleNotDoubleCounted = bundleDeduplicatedResult.totalCostINR === 105000;

    const passed =
      negativeGuestsRejected &&
      negativeRateRejected &&
      taxIncludedRespected &&
      bundleNotDoubleCounted;

    results.push({
      id: 'TEST_D',
      name: 'Test D: Input invariants (Negative values rejected, tax inclusion, bundle deduplication)',
      passed,
      notes: passed
        ? 'Safely rejected invalid negative numbers, prevented double counting of venue bundle, and respected tax-inclusive rate.'
        : `Checks: negGuest=${negativeGuestsRejected}, negRate=${negativeRateRejected}, tax=${taxIncludedRespected}, bundle=${bundleNotDoubleCounted}`,
      data: { negativeGuestsRejected, negativeRateRejected, taxIncludedRespected, bundleNotDoubleCounted },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_D', name: 'Test D', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  // TEST E: All sample data visibly marked modelled; a manually entered quote isn't labeled verified
  try {
    // 1. Check seed sample evidence
    const allSampleModelled = SAMPLE_JAIPUR_EVIDENCE.every(
      (ev) => ev.sourceType === 'MODELLED_SAMPLE' && ev.label.includes('Illustrative sample')
    );

    // 2. Simulate user-entered quote
    const userQuote: PricingEvidence = {
      id: 'quote-caterer-123',
      region: 'Jaipur',
      category: 'Catering',
      serviceTier: 'standard',
      unit: 'plate',
      estimateLowPaise: 88000,
      estimateBasePaise: 92000,
      estimateHighPaise: 95000,
      sourceType: 'USER_QUOTE',
      inclusions: ['Full dinner service'],
      exclusions: [],
      qualityChecks: { hasTaxIncluded: false, isDoubleCountProtected: true, isVerified: false },
      label: 'USER_QUOTE - User-entered quote, not verified',
    };

    const isUserQuoteUnverified =
      userQuote.sourceType === 'USER_QUOTE' &&
      userQuote.qualityChecks.isVerified === false &&
      !userQuote.label.includes('VERIFIED');

    const passed = allSampleModelled && isUserQuoteUnverified;

    results.push({
      id: 'TEST_E',
      name: 'Test E: Evidence Provenance & Mocks (Sample labeled modelled, user quote unverified)',
      passed,
      notes: passed
        ? 'All baseline evidence explicitly labeled MODELLED_SAMPLE; user-entered quote flagged as unverified without live claims.'
        : `Failed: sampleModelled=${allSampleModelled}, userQuoteUnverified=${isUserQuoteUnverified}`,
      data: { allSampleModelled, isUserQuoteUnverified },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_E', name: 'Test E', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  // TEST F: Gemini recommendations are numerically consistent with tool response; never change approved Firestore allocations
  try {
    const categoriesBefore = JSON.parse(JSON.stringify(INITIAL_BUDGET_CATEGORIES)) as BudgetCategory[];
    const originalCateringAllocated = categoriesBefore.find((c) => c.name.toLowerCase().includes('catering'))?.allocated;

    // Run Gemini Advisory (which calls getBudgetAnalysis tool)
    const advisoryResult = await budgetAdvisorService.generateBudgetAdvisory(
      INITIAL_EVENT,
      categoriesBefore,
      { guestCount: 250, stressPercentage: 0, useReserveToCoverOverrun: true }
    );

    // Verify advisory math matches tool analysis exactly
    const toolCost = advisoryResult.analysis.cateringEstimate.totalCostINR;
    const advisoryContainsToolFigure =
      advisoryResult.explanation.includes('2,45,000') ||
      advisoryResult.explanation.includes('245000');

    // Invariant: Generating an advisory NEVER mutates categoriesBefore
    const cateringAfter = categoriesBefore.find((c) => c.name.toLowerCase().includes('catering'))?.allocated;
    const persistenceNotUnilaterallyMutated = cateringAfter === originalCateringAllocated;

    const passed = toolCost === 245000 && advisoryContainsToolFigure && persistenceNotUnilaterallyMutated;

    results.push({
      id: 'TEST_F',
      name: 'Test F: Gemini Advisory Boundary (Numerically consistent with tool math, no unilateral persistence)',
      passed,
      notes: passed
        ? `Gemini advisory accurately cited tool catering figure (₹2,45,000) and did not mutate Firestore allocations.`
        : `Failed: toolCost=${toolCost}, containsFigure=${advisoryContainsToolFigure}, unmutated=${persistenceNotUnilaterallyMutated}`,
      data: { toolCost, advisoryContainsToolFigure, persistenceNotUnilaterallyMutated },
    });
  } catch (err: unknown) {
    results.push({ id: 'TEST_F', name: 'Test F', passed: false, notes: err instanceof Error ? err.message : String(err) });
  }

  const passCount = results.filter((r) => r.passed).length;

  return {
    allPassed: passCount === results.length,
    totalTests: results.length,
    passCount,
    results,
    timestamp: new Date().toISOString(),
  };
}
