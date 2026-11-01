/**
 * Utsav AI — Phase 4: Budget Intelligence Client Service
 * Connects frontend UI to deterministic budget engine and Gemini advisory assistant.
 */

import { BudgetEngine } from '../domain/budgetEngine';
import {
  BudgetAnalysisResult,
  BudgetCategory,
  BudgetScenario,
  EventModel,
} from '../types';

export class BudgetIntelligenceClient {
  /**
   * Get deterministic budget analysis
   */
  public async getAnalysis(
    event: EventModel,
    categories: BudgetCategory[],
    scenario?: BudgetScenario
  ): Promise<BudgetAnalysisResult> {
    try {
      const res = await fetch('/api/budget/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, categories, scenario }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[BudgetIntelligenceClient] Network error calling /api/budget/analysis, computing client-side:', err);
    }
    // Safe client-side fallback using domain engine
    return BudgetEngine.getBudgetAnalysis(event, categories, scenario);
  }

  /**
   * Get Gemini explanation grounded in tool analysis
   */
  public async getAdvisory(
    event: EventModel,
    categories: BudgetCategory[],
    scenario: BudgetScenario,
    authToken?: string
  ): Promise<{
    explanation: string;
    analysis: BudgetAnalysisResult;
    simulated: boolean;
    notice?: string;
  }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: authToken ? (authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`) : 'Bearer demo-user-guest',
      };

      const res = await fetch('/api/budget/advisory', {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, categories, scenario }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[BudgetIntelligenceClient] Server advisory unavailable, computing local simulation:', err);
    }

    const localAnalysis = BudgetEngine.getBudgetAnalysis(event, categories, scenario);
    const delta = localAnalysis.cateringEstimate.totalCostINR - 200000;
    const isOverrun = delta > 0;

    return {
      explanation: `### Budget Advisory & Tradeoff Analysis (Demo Simulation)\n\n• **Attendance**: Adjusting to **${scenario.guestCount} guests** yields catering cost **₹${localAnalysis.cateringEstimate.totalCostINR.toLocaleString('en-IN')}** (${isOverrun ? '+' : ''}₹${delta.toLocaleString('en-IN')} vs baseline ₹2,00,000).\n• **Reserve Protection**: Absorbing this from **₹${localAnalysis.reserveHealth.originalReserveINR.toLocaleString('en-IN')} reserve** leaves **₹${localAnalysis.reserveHealth.revisedReserveINR.toLocaleString('en-IN')}** safely maintaining the strict **₹${localAnalysis.totalBudgetINR.toLocaleString('en-IN')}** cap.\n\n*(Demo simulation — Gemini integration comes later. API key not configured on server.)*`,
      analysis: localAnalysis,
      simulated: true,
      notice: 'Demo simulation — Gemini integration comes later',
    };
  }

  /**
   * Run Phase 4 Acceptance Test Suite
   */
  public async runTests(): Promise<any> {
    const res = await fetch('/api/budget/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  }
}

export const budgetIntelligenceClient = new BudgetIntelligenceClient();
