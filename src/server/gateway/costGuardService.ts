import { GATEWAY_CONFIG, MODEL_PRICING_TABLE } from './config';
import { CostSummary, ModelPricing } from './types';

export class CostGuardService {
  private totalSpentUsd: number = 0;
  private projectBudgetLimitUsd: number = GATEWAY_CONFIG.PROJECT_BUDGET_LIMIT_USD;
  private pricingTable: Record<string, ModelPricing> = { ...MODEL_PRICING_TABLE };
  private totalRequestsCount: number = 0;
  private successfulRequestsCount: number = 0;
  private failedRequestsCount: number = 0;
  private cacheHitsCount: number = 0;

  /**
   * Calculates the estimated cost of an AI operation in USD based on model pricing metadata.
   */
  public calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.pricingTable[modelId] || this.pricingTable['gemini-3.8-flash'];
    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPerMillion;
    // Round to 6 decimal places for high precision micro-accounting
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
  }

  /**
   * Checks if the project-wide spending threshold has been reached or exceeded.
   */
  public isBudgetExhausted(): boolean {
    return this.totalSpentUsd >= this.projectBudgetLimitUsd;
  }

  /**
   * Asserts whether a request can proceed under the project-wide budget limit.
   */
  public checkBudgetGuard(): { allowed: boolean; remainingBudgetUsd: number; error?: string } {
    const remaining = Math.max(0, this.projectBudgetLimitUsd - this.totalSpentUsd);
    if (this.isBudgetExhausted()) {
      return {
        allowed: false,
        remainingBudgetUsd: 0,
        error: `Application AI budget exhausted. Current spend ($${this.totalSpentUsd.toFixed(4)}) reached the safety threshold ($${this.projectBudgetLimitUsd.toFixed(2)}).`,
      };
    }
    return {
      allowed: true,
      remainingBudgetUsd: remaining,
    };
  }

  /**
   * Records completed request cost and updates totals.
   */
  public recordExpense(
    costUsd: number,
    success: boolean,
    isCacheHit: boolean = false
  ): void {
    this.totalSpentUsd += costUsd;
    this.totalRequestsCount += 1;
    if (success) {
      this.successfulRequestsCount += 1;
    } else {
      this.failedRequestsCount += 1;
    }
    if (isCacheHit) {
      this.cacheHitsCount += 1;
    }
  }

  /**
   * Retrieves high-level spending & accounting summary.
   */
  public getSummary(): CostSummary {
    const remainingBudgetUsd = Math.max(0, this.projectBudgetLimitUsd - this.totalSpentUsd);
    const cacheHitRatio =
      this.totalRequestsCount > 0 ? this.cacheHitsCount / this.totalRequestsCount : 0;

    return {
      totalSpentUsd: Math.round(this.totalSpentUsd * 10000) / 10000,
      projectBudgetLimitUsd: this.projectBudgetLimitUsd,
      remainingBudgetUsd: Math.round(remainingBudgetUsd * 10000) / 10000,
      isBudgetExhausted: this.isBudgetExhausted(),
      totalRequestsCount: this.totalRequestsCount,
      successfulRequestsCount: this.successfulRequestsCount,
      failedRequestsCount: this.failedRequestsCount,
      cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
    };
  }

  /**
   * Admin configuration updates.
   */
  public setProjectBudgetLimit(limitUsd: number): void {
    if (limitUsd >= 0) {
      this.projectBudgetLimitUsd = limitUsd;
    }
  }

  public getPricingTable(): Record<string, ModelPricing> {
    return { ...this.pricingTable };
  }

  public resetForTesting(): void {
    this.totalSpentUsd = 0;
    this.totalRequestsCount = 0;
    this.successfulRequestsCount = 0;
    this.failedRequestsCount = 0;
    this.cacheHitsCount = 0;
  }
}

export const costGuardService = new CostGuardService();
