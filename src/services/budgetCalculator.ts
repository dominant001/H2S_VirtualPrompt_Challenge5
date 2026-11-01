import { BudgetCategory, ChangeProposal, EventModel } from '../types';
import { BudgetEngine } from '../domain/budgetEngine';
import { Money } from '../domain/money';

export const BASELINE_PLATE_RATE = 900;
export const BASELINE_EXTRAS = 20000;

/**
 * Calculates catering cost according to baseline deterministic engine with integer Paise precision:
 * catering = chargeablePlates * plateRate + specifiedExtras
 */
export function calculateCateringCost(
  chargeablePlates: number,
  ratePerPlate: number = BASELINE_PLATE_RATE,
  extras: number = BASELINE_EXTRAS
): number {
  const result = BudgetEngine.estimateCatering({
    guestCount: chargeablePlates,
    chargeableCount: chargeablePlates,
    perPlateRate: ratePerPlate,
    extraCounters: extras,
  });
  return result.totalCostINR;
}

/**
 * Generates deterministic change proposal for guest count changes.
 * E.g. 200 -> 250 guests with ₹12L total budget
 */
export function createGuestAdjustmentProposal(
  event: EventModel,
  categories: BudgetCategory[],
  newGuestCount: number
): ChangeProposal {
  const originalGuestCount = event.guestCount;
  const plateRate = event.cateringModel.sampleRatePerPlate || BASELINE_PLATE_RATE;
  const extras = event.cateringModel.sampleExtras || BASELINE_EXTRAS;

  const originalCateringCost = calculateCateringCost(originalGuestCount, plateRate, extras);
  const revisedCateringCost = calculateCateringCost(newGuestCount, plateRate, extras);
  const difference = revisedCateringCost - originalCateringCost;

  const contingencyCategory = categories.find((c) => c.isContingency || c.name.toLowerCase().includes('contingency'));
  const originalReserve = contingencyCategory ? contingencyCategory.allocated : 180000;
  const revisedReserve = Math.max(0, originalReserve - difference);

  const affectedTaskTitles = [
    'Confirm venue seating layout & banquet capacity for ' + newGuestCount + ' guests',
    'Update catering head-count guarantee clause with caterer',
    'Recalculate wedding invitation printing quantities & address labels',
    'Arrange additional guest transport & airport/station pickup shuttles',
    'Review dining hall table layout & buffet counter throughput',
  ];

  return {
    id: `prop-${Date.now()}`,
    eventId: event.id,
    baseVersion: event.version || 1,
    title: `Increase guest count from ${originalGuestCount} to ${newGuestCount}`,
    description: `Adjusting attendance requires +₹${difference.toLocaleString('en-IN')} for food & beverage service. Total budget remains strictly capped at ₹${event.totalBudget.toLocaleString('en-IN')} by absorbing the overrun from the Contingency Reserve.`,
    impactSummary: {
      originalGuestCount,
      revisedGuestCount: newGuestCount,
      originalCateringCost,
      revisedCateringCost,
      difference,
      originalReserve,
      revisedReserve,
      totalBudget: event.totalBudget,
    },
    affectedTaskTitles,
    resolutionType: 'use_reserve',
    status: 'pending',
    applied: false,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Applies an approved proposal to budget categories immutably.
 */
export function applyProposalToCategories(
  categories: BudgetCategory[],
  proposal: ChangeProposal
): BudgetCategory[] {
  const { difference, revisedCateringCost, revisedReserve } = proposal.impactSummary;

  return categories.map((cat) => {
    // If catering
    if (cat.name.toLowerCase().includes('catering')) {
      return {
        ...cat,
        allocated: revisedCateringCost,
        estimatedBase: revisedCateringCost,
        estimatedHigh: Math.round(revisedCateringCost * 1.1),
        notes: `Updated from approved proposal: +₹${difference.toLocaleString('en-IN')} due to guest count change.`,
      };
    }
    // If contingency reserve
    if (cat.isContingency || cat.name.toLowerCase().includes('contingency')) {
      return {
        ...cat,
        allocated: revisedReserve,
        notes: `Reduced by ₹${difference.toLocaleString('en-IN')} to absorb catering adjustment without increasing total budget.`,
      };
    }
    return cat;
  });
}
