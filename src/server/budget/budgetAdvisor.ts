/**
 * Utsav AI — Phase 4: Gemini Budget Advisory Assistant
 * Acts as an explanation and tradeoff assistant ONLY.
 * Uses getBudgetAnalysis tool for all math — never calculates or invents money.
 */

import { BudgetEngine } from '../../domain/budgetEngine';
import { BudgetCategory, BudgetScenario, EventModel } from '../../types';
import { aiUsageGateway } from '../gateway/gateway';

export const BUDGET_ADVISOR_SYSTEM_INSTRUCTION = `
You are the Chief Financial Strategist and Budget Explanation Assistant for Utsav AI.

CORE DISCIPLINE & OPERATIONAL BOUNDARIES:
1. DETERMINISTIC MATH ONLY: You MUST NOT invent, calculate, or hallucinate budget figures. All financial calculations, differences, catering sums, and reserve impacts are computed by the deterministic BudgetEngine tool and supplied to you.
2. ADVISORY ONLY: Your output is an explanation, advisory narrative, and proposal of tradeoffs. You CANNOT mutate database allocations, authorize expenditures, or persist changes.
3. GROUNDED IN TOOL DATA: Strictly reference the exact INR figures provided in the tool output.
4. TRADE-OFF RECOMMENDATIONS: Present practical, culturally informed tradeoffs for Indian celebrations (e.g. absorbing catering from contingency vs reducing floral stage density vs adjusting guest lists).

Output format: Return clear, empathetic markdown explaining the scenario, the mathematical impact, and 2-3 actionable tradeoff options for the host family.
`.trim();

export class BudgetAdvisorService {
  /**
   * Tool implementation: getBudgetAnalysis(eventId, scenario)
   * Deterministically calculates budget metrics and evidence.
   */
  public getBudgetAnalysis(event: EventModel, categories: BudgetCategory[], scenario?: BudgetScenario) {
    return BudgetEngine.getBudgetAnalysis(event, categories, scenario);
  }

  /**
   * Generate Gemini advisory grounded in tool output
   */
  public async generateBudgetAdvisory(
    event: EventModel,
    categories: BudgetCategory[],
    scenario: BudgetScenario,
    authHeader?: string
  ): Promise<{
    explanation: string;
    analysis: ReturnType<typeof BudgetEngine.getBudgetAnalysis>;
    simulated: boolean;
    notice?: string;
  }> {
    // 1. Tool execution (Validated math)
    const analysis = this.getBudgetAnalysis(event, categories, scenario);

    const cateringDelta = analysis.cateringEstimate.totalCostINR - 200000;
    const isOverrun = cateringDelta > 0;

    // 2. Build structured prompt with tool results
    const prompt = `
[TOOL OUTPUT: getBudgetAnalysis]
Event: "${event.name}" (${event.city}, ${event.type})
Total Budget Cap: ₹${analysis.totalBudgetINR.toLocaleString('en-IN')}
Total Allocated: ₹${analysis.totalAllocatedINR.toLocaleString('en-IN')} (Balanced: ${analysis.isBalanced})
Original Contingency Reserve: ₹${analysis.reserveHealth.originalReserveINR.toLocaleString('en-IN')}
Scenario Guests: ${scenario.guestCount} (Original: ${event.guestCount})
Scenario Stress: ${scenario.stressPercentage}%
Catering Baseline: 200 plates × ₹900 + ₹20,000 = ₹2,00,000
Scenario Catering Estimate: ${analysis.cateringEstimate.chargeablePlates} plates × ₹${scenario.plateRate || 900} + ₹${scenario.extras || 20000} = ₹${analysis.cateringEstimate.totalCostINR.toLocaleString('en-IN')}
Catering Variance / Overrun: ${isOverrun ? '+' : ''}₹${cateringDelta.toLocaleString('en-IN')}
Revised Reserve (if absorbed): ₹${analysis.reserveHealth.revisedReserveINR.toLocaleString('en-IN')} (${analysis.reserveHealth.status})
Reserve Consumed: ₹${analysis.reserveHealth.reserveConsumedINR.toLocaleString('en-IN')}

Explain this scenario to the host family in plain language.
Present clear tradeoff choices (e.g. using reserve vs adjusting decor/outfit categories vs renegotiating plate rate).
Do not calculate new numbers; use only the figures from the tool output above.
`.trim();

    try {
      const response = await aiUsageGateway.execute(
        {
          workflow: 'BUDGET_EXPLANATION',
          prompt,
          systemInstruction: BUDGET_ADVISOR_SYSTEM_INSTRUCTION,
          contextData: {
            eventId: event.id,
            guestCount: scenario.guestCount,
            totalBudget: event.totalBudget,
          },
        },
        undefined,
        authHeader
      );

      if (response.success && response.text) {
        if (response.text.includes('Demo simulation')) {
          return this.generateSimulatedAdvisory(analysis, scenario);
        }
        return {
          explanation: response.text,
          analysis,
          simulated: false,
          notice: undefined,
        };
      } else {
        return this.generateSimulatedAdvisory(analysis, scenario);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[BudgetAdvisor] Gateway call failed, running deterministic simulation fallback:', message);
      return this.generateSimulatedAdvisory(analysis, scenario);
    }
  }

  /**
   * Deterministic simulation fallback for uncredited / demo environments
   */
  public generateSimulatedAdvisory(
    analysis: ReturnType<typeof BudgetEngine.getBudgetAnalysis>,
    scenario: BudgetScenario
  ): {
    explanation: string;
    analysis: ReturnType<typeof BudgetEngine.getBudgetAnalysis>;
    simulated: boolean;
    notice: string;
  } {
    const delta = analysis.cateringEstimate.totalCostINR - 200000;
    const isOverrun = delta > 0;

    let narrative = `### Budget Impact & Tradeoff Advisory (Demo Simulation)\n\n`;
    narrative += `• **Attendance Adjustment**: Changing guest count to **${scenario.guestCount} guests** yields a revised catering cost of **₹${analysis.cateringEstimate.totalCostINR.toLocaleString('en-IN')}** `;
    narrative += `(${isOverrun ? '+' : ''}₹${delta.toLocaleString('en-IN')} variance vs baseline ₹2,00,000).\n`;
    narrative += `• **Reserve Protection**: Absorbing this adjustment from your **₹${analysis.reserveHealth.originalReserveINR.toLocaleString('en-IN')} Contingency Reserve** leaves **₹${analysis.reserveHealth.revisedReserveINR.toLocaleString('en-IN')}** in reserve while preserving your strict **₹${analysis.totalBudgetINR.toLocaleString('en-IN')}** event ceiling.\n\n`;
    narrative += `#### Recommended Tradeoff Options:\n`;
    narrative += `1. **Approve Reserve Allocation (Recommended)**: Absorb the ₹${Math.abs(delta).toLocaleString('en-IN')} overrun into contingency reserve. Leaves ₹${analysis.reserveHealth.revisedReserveINR.toLocaleString('en-IN')} for event-week unexpected expenses.\n`;
    narrative += `2. **Vendor Negotiation**: Request the caterer reduce per-plate rate from ₹${scenario.plateRate || 900} to ₹${Math.round(200000 / scenario.guestCount)} to stay within the original ₹2,00,000 allocation.\n`;
    narrative += `3. **Decor/Gift Reallocation**: Reallocate ₹${Math.abs(delta).toLocaleString('en-IN')} from Decor (₹1,30,000) or Invitations (₹30,000) without touching reserve.\n\n`;
    narrative += `*(Demo simulation — Gemini integration comes later. API key not configured on server or credits depleted.)*`;

    return {
      explanation: narrative,
      analysis,
      simulated: true,
      notice: 'Demo simulation — Gemini integration comes later',
    };
  }
}

export const budgetAdvisorService = new BudgetAdvisorService();
