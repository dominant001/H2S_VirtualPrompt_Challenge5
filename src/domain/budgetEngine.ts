/**
 * Utsav AI — Phase 4: Evidence-Aware Deterministic Budget Engine
 * Encapsulates all financial calculations, catering estimation, evidence tracking,
 * and allocation validation using integer paise precision arithmetic.
 */

import {
  BudgetAnalysisResult,
  BudgetCategory,
  BudgetScenario,
  CateringEstimateParams,
  CateringEstimateResult,
  EventModel,
  PricingEvidence,
} from '../types';
import { Money, Paise } from './money';

export const SAMPLE_JAIPUR_EVIDENCE: PricingEvidence[] = [
  {
    id: 'ev-jaipur-catering-standard',
    region: 'Jaipur, Rajasthan',
    locality: 'Heritage Corridor / Outskirts',
    category: 'Catering',
    serviceTier: 'standard',
    diet: 'vegetarian',
    unit: 'per plate',
    estimateLowPaise: Money.fromINR(850),
    estimateBasePaise: Money.fromINR(900),
    estimateHighPaise: Money.fromINR(1050),
    sourceType: 'MODELLED_SAMPLE',
    inclusions: [
      'Royal Rajasthani thali (Dal Baati Churma, Gatte, Ker Sangri)',
      'Live chaat counter and welcome mocktails',
      'Standard cutlery, linen, and 20 service staff',
    ],
    exclusions: ['Midnight snack counters', 'Exotic imported fruit stations'],
    qualityChecks: {
      hasTaxIncluded: false,
      isDoubleCountProtected: true,
      isVerified: false,
    },
    label: 'MODELLED_SAMPLE - Illustrative sample, not a verified live offer',
  },
  {
    id: 'ev-jaipur-venue-lawn',
    region: 'Jaipur, Rajasthan',
    locality: 'Kukas / Amer Road',
    category: 'Venue',
    serviceTier: 'standard',
    unit: 'rental for 1 function',
    estimateLowPaise: Money.fromINR(280000),
    estimateBasePaise: Money.fromINR(300000),
    estimateHighPaise: Money.fromINR(350000),
    sourceType: 'MODELLED_SAMPLE',
    inclusions: ['Heritage Haveli courtyard & lawn for 8 hours', 'Generator backup & bridal suite'],
    exclusions: ['Commercial electricity usage beyond 50 units', 'Mandap cleaning deposit'],
    qualityChecks: {
      hasTaxIncluded: true,
      isDoubleCountProtected: true,
      isVerified: false,
    },
    label: 'MODELLED_SAMPLE - Illustrative sample, not a verified live offer',
  },
  {
    id: 'ev-jaipur-decor-floral',
    region: 'Jaipur, Rajasthan',
    locality: 'Johari Bazaar Trade Aggregate',
    category: 'Decor',
    serviceTier: 'standard',
    unit: 'mandap & reception floral stage',
    estimateLowPaise: Money.fromINR(115000),
    estimateBasePaise: Money.fromINR(130000),
    estimateHighPaise: Money.fromINR(150000),
    sourceType: 'MODELLED_SAMPLE',
    inclusions: ['Fresh Marigold & Jasmine floral mandap', 'Entrance archway', 'Warm mood lighting'],
    exclusions: ['Imported orchid ceiling grids', 'Custom structural iron trussing'],
    qualityChecks: {
      hasTaxIncluded: true,
      isDoubleCountProtected: true,
      isVerified: false,
    },
    label: 'MODELLED_SAMPLE - Illustrative sample, not a verified live offer',
  },
];

export class BudgetEngine {
  /**
   * Deterministically estimate catering cost with integer Paise precision.
   * Enforces non-negative inputs, tax inclusion checks, minimum guarantees, and bundle deduplication.
   */
  public static estimateCatering(params: CateringEstimateParams): CateringEstimateResult {
    // 1. Input Validation
    if (params.guestCount < 0) {
      throw new Error(`Invalid guestCount: ${params.guestCount}. Guest count cannot be negative.`);
    }
    if (params.perPlateRate < 0) {
      throw new Error(`Invalid perPlateRate: ${params.perPlateRate}. Rate per plate cannot be negative.`);
    }

    const minGuarantee = params.minimumGuarantee ?? 0;
    const guestCount = params.guestCount;
    // Chargeable count is at least minimum guarantee or explicit chargeable count
    const chargeablePlates = params.chargeableCount ?? Math.max(guestCount, minGuarantee);

    // 2. Base Food Cost in Paise
    const plateRatePaise = Money.fromINR(params.perPlateRate);
    const baseFoodCostPaise: Paise = Money.multiply(plateRatePaise, chargeablePlates);

    // 3. Extras, Fixed Charges, Transport in Paise
    const extrasPaise: Paise = Money.fromINR(params.extraCounters ?? 0);
    const fixedChargesPaise: Paise = Money.fromINR(params.fixedCharges ?? 0);
    const transportPaise: Paise = Money.fromINR(params.transport ?? 0);
    const totalAddonsPaise: Paise = Money.add(extrasPaise, Money.add(fixedChargesPaise, transportPaise));

    // 4. Bundle Package Inclusions Deductions (Anti-Double Counting)
    let bundleDeductionsPaise: Paise = 0;
    if (params.venuePackageInclusions) {
      if (params.venuePackageInclusions.bundleCreditINR) {
        bundleDeductionsPaise = Money.fromINR(params.venuePackageInclusions.bundleCreditINR);
      }
    }

    // Subtotal before tax
    const preTaxSubtotalPaise = Math.max(
      0,
      Money.subtract(Money.add(baseFoodCostPaise, totalAddonsPaise), bundleDeductionsPaise)
    );

    // 5. Applicable Taxes
    let taxAmountPaise: Paise = 0;
    if (params.applicableTaxes) {
      if (!params.applicableTaxes.taxIncludedInPlateRate && params.applicableTaxes.taxRatePercent > 0) {
        taxAmountPaise = Money.multiply(preTaxSubtotalPaise, params.applicableTaxes.taxRatePercent / 100);
      }
    }

    // 6. Total Catering Cost
    const totalCostPaise: Paise = Money.add(preTaxSubtotalPaise, taxAmountPaise);
    const totalCostINR = Money.toINR(totalCostPaise);
    const effectiveRatePerPlate = chargeablePlates > 0 ? Math.round((totalCostINR / chargeablePlates) * 100) / 100 : 0;

    return {
      chargeablePlates,
      baseFoodCostINR: Money.toINR(baseFoodCostPaise),
      baseFoodCostPaise,
      extrasINR: Money.toINR(extrasPaise),
      extrasPaise,
      taxAmountINR: Money.toINR(taxAmountPaise),
      taxAmountPaise,
      bundleDeductionsINR: Money.toINR(bundleDeductionsPaise),
      bundleDeductionsPaise,
      totalCostINR,
      totalCostPaise,
      effectiveRatePerPlate,
      breakdown: {
        foodSubtotal: Money.toINR(baseFoodCostPaise),
        extraCounters: Money.toINR(extrasPaise),
        transport: Money.toINR(transportPaise),
        taxes: Money.toINR(taxAmountPaise),
        bundleCredit: Money.toINR(bundleDeductionsPaise),
      },
    };
  }

  /**
   * Validates budget allocation invariants:
   * 1. sum(category allocated including reserve) == totalBudget
   * 2. all allocated values >= 0
   * 3. warn when commitments > allocation or cash constraints violated
   */
  public static validateAllocations(
    categories: BudgetCategory[],
    totalBudgetINR: number
  ): {
    isValid: boolean;
    totalAllocatedINR: number;
    differenceINR: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    let totalAllocatedPaise: Paise = 0;
    let totalCommittedPaise: Paise = 0;
    const targetBudgetPaise = Money.fromINR(totalBudgetINR);

    for (const cat of categories) {
      if (cat.allocated < 0) {
        errors.push(`Category "${cat.name}" has negative allocation: ₹${cat.allocated}. Allocations must be >= 0.`);
      }
      const catAllocatedPaise = Money.fromINR(cat.allocated);
      const catCommittedPaise = Money.fromINR(cat.committedAmount ?? cat.committed);

      totalAllocatedPaise = Money.add(totalAllocatedPaise, catAllocatedPaise);
      totalCommittedPaise = Money.add(totalCommittedPaise, catCommittedPaise);

      if (catCommittedPaise > catAllocatedPaise) {
        warnings.push(
          `Category "${cat.name}" is overcommitted: Committed ₹${Money.toINR(catCommittedPaise).toLocaleString('en-IN')} exceeds allocation ₹${cat.allocated.toLocaleString('en-IN')}.`
        );
      }
    }

    const differencePaise = Money.subtract(totalAllocatedPaise, targetBudgetPaise);
    const differenceINR = Money.toINR(differencePaise);

    if (differencePaise !== 0) {
      errors.push(
        `Allocations unbalanced: Sum of categories (₹${Money.toINR(totalAllocatedPaise).toLocaleString('en-IN')}) does not equal total budget ceiling (₹${totalBudgetINR.toLocaleString('en-IN')}). Difference: ₹${differenceINR.toLocaleString('en-IN')}.`
      );
    }

    if (totalCommittedPaise > targetBudgetPaise) {
      warnings.push(
        `Critical Cash Constraint: Total commitments (₹${Money.toINR(totalCommittedPaise).toLocaleString('en-IN')}) exceed total celebration budget (₹${totalBudgetINR.toLocaleString('en-IN')}).`
      );
    }

    return {
      isValid: errors.length === 0,
      totalAllocatedINR: Money.toINR(totalAllocatedPaise),
      differenceINR,
      errors,
      warnings,
    };
  }

  /**
   * Generates complete explainable analysis object for an event and scenario
   */
  public static getBudgetAnalysis(
    event: EventModel,
    categories: BudgetCategory[],
    scenario?: BudgetScenario
  ): BudgetAnalysisResult {
    const guestCount = scenario?.guestCount ?? event.guestCount;
    const plateRate = scenario?.plateRate ?? event.cateringModel.sampleRatePerPlate ?? 900;
    const extras = scenario?.extras ?? event.cateringModel.sampleExtras ?? 20000;
    const stressPercent = scenario?.stressPercentage ?? 0;

    // Apply stress test factor if requested
    const effectivePlateRate = stressPercent > 0 ? Math.round(plateRate * (1 + stressPercent / 100)) : plateRate;

    // Estimate Catering with deterministic engine
    const cateringEstimate = BudgetEngine.estimateCatering({
      guestCount,
      perPlateRate: effectivePlateRate,
      extraCounters: extras,
    });

    const validation = BudgetEngine.validateAllocations(categories, event.totalBudget);

    // Find Reserve Category
    const reserveCat = categories.find((c) => c.isContingency || c.name.toLowerCase().includes('contingency'));
    const originalReserveINR = reserveCat ? reserveCat.allocated : 180000;

    // Find current catering allocation
    const currentCateringCat = categories.find((c) => c.name.toLowerCase().includes('catering'));
    const baselineCateringAllocated = currentCateringCat ? currentCateringCat.allocated : 200000;

    const cateringDeltaINR = cateringEstimate.totalCostINR - baselineCateringAllocated;
    let revisedReserveINR = originalReserveINR;
    let reserveConsumedINR = 0;

    if (scenario?.useReserveToCoverOverrun && cateringDeltaINR > 0) {
      reserveConsumedINR = Math.min(originalReserveINR, cateringDeltaINR);
      revisedReserveINR = Math.max(0, originalReserveINR - reserveConsumedINR);
    }

    let reserveStatus: 'HEALTHY' | 'WARNING' | 'EXHAUSTED' = 'HEALTHY';
    if (revisedReserveINR <= 0) {
      reserveStatus = 'EXHAUSTED';
    } else if (revisedReserveINR < 50000) {
      reserveStatus = 'WARNING';
    }

    // Calculate commitments & payments
    let totalCommittedINR = 0;
    let totalPaidINR = 0;
    let modelledCount = 0;
    let quotedCount = 0;
    let verifiedCount = 0;
    let contractedCount = 0;

    for (const c of categories) {
      totalCommittedINR += c.committedAmount ?? c.committed;
      totalPaidINR += c.paidAmount ?? c.paid;

      const src = (c.sourceType || 'modelled').toUpperCase();
      if (src.includes('MODELLED')) modelledCount++;
      else if (src.includes('QUOTE')) quotedCount++;
      else if (src.includes('VERIFIED')) verifiedCount++;
      else if (src.includes('CONTRACT')) contractedCount++;
      else modelledCount++;
    }

    const totalCats = categories.length || 1;
    const totalOutstandingINR = Math.max(0, totalCommittedINR - totalPaidINR);

    return {
      totalBudgetINR: event.totalBudget,
      totalAllocatedINR: validation.totalAllocatedINR,
      reserveAllocatedINR: revisedReserveINR,
      remainingUnallocatedINR: Math.max(0, event.totalBudget - validation.totalAllocatedINR),
      totalCommittedINR,
      totalPaidINR,
      totalOutstandingINR,
      isBalanced: validation.isValid,
      allocationVarianceINR: validation.differenceINR,
      cateringEstimate,
      categories,
      pricingEvidence: SAMPLE_JAIPUR_EVIDENCE,
      sourceCoverage: {
        modelledSamplePercent: Math.round((modelledCount / totalCats) * 100),
        quotedPercent: Math.round((quotedCount / totalCats) * 100),
        verifiedPercent: Math.round((verifiedCount / totalCats) * 100),
        contractedPercent: Math.round((contractedCount / totalCats) * 100),
      },
      reserveHealth: {
        originalReserveINR,
        revisedReserveINR,
        reserveConsumedINR,
        status: reserveStatus,
      },
      warnings: validation.warnings,
    };
  }
}
