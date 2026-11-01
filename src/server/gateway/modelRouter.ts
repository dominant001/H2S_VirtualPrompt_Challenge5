import { AVAILABLE_MODELS, GATEWAY_CONFIG, WORKFLOW_ROUTING_CONFIG } from './config';
import { AIWorkflow, ModelRouteConfig } from './types';

export class ModelRouter {
  private routingTable: Map<AIWorkflow, ModelRouteConfig> = new Map();
  private allowExpensiveFallback: boolean = GATEWAY_CONFIG.ALLOW_EXPENSIVE_FALLBACK;

  constructor() {
    Object.entries(WORKFLOW_ROUTING_CONFIG).forEach(([workflow, config]) => {
      this.routingTable.set(workflow as AIWorkflow, { ...config });
    });
  }

  /**
   * Resolves the configured model routing parameters for a specific workflow.
   */
  public resolveRoute(workflow: AIWorkflow): ModelRouteConfig {
    const config = this.routingTable.get(workflow);
    if (!config) {
      // Default safe fallback route
      return {
        workflow,
        tier: 'low_cost',
        primaryModelId: AVAILABLE_MODELS.FLASH,
        thinkingLevel: 'LOW',
        maxInputTokens: 4000,
        maxOutputTokens: 1000,
        cacheTtlSeconds: 1800,
        isPersonalized: true,
      };
    }
    return { ...config };
  }

  /**
   * Validates if a model transition or fallback is permissible.
   * Strict safety: Never automatically upgrade to a more expensive model
   * unless administrator explicitly enabled that behavior.
   */
  public resolveFallback(currentConfig: ModelRouteConfig): string | null {
    if (!currentConfig.fallbackModelId) {
      return null;
    }

    const isCurrentLowCost = currentConfig.tier === 'low_cost';
    const isFallbackReasoningOrPaid =
      currentConfig.fallbackModelId === AVAILABLE_MODELS.ARGON_PRO;

    if (isCurrentLowCost && isFallbackReasoningOrPaid && !this.allowExpensiveFallback) {
      console.warn(
        `[ModelRouter] Rejected automatic expensive fallback from ${currentConfig.primaryModelId} to ${currentConfig.fallbackModelId} because allowExpensiveFallback is disabled.`
      );
      return null;
    }

    return currentConfig.fallbackModelId;
  }

  /**
   * Set expensive fallback permission (admin flag).
   */
  public setAllowExpensiveFallback(allowed: boolean): void {
    this.allowExpensiveFallback = allowed;
  }

  public getAllowExpensiveFallback(): boolean {
    return this.allowExpensiveFallback;
  }

  /**
   * Update route configuration at runtime.
   */
  public updateRoute(workflow: AIWorkflow, updates: Partial<ModelRouteConfig>): void {
    const existing = this.routingTable.get(workflow);
    if (existing) {
      this.routingTable.set(workflow, { ...existing, ...updates });
    }
  }

  public getAllRoutes(): Record<string, ModelRouteConfig> {
    const res: Record<string, ModelRouteConfig> = {};
    this.routingTable.forEach((v, k) => {
      res[k] = { ...v };
    });
    return res;
  }
}

export const modelRouter = new ModelRouter();
