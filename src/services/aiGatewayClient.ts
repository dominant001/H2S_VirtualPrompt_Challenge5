import {
  AIWorkflow,
  GatewayExecuteResponse,
  GatewayRequestPayload,
  QuotaStatus,
  CostSummary,
  AIUsageLogEntry,
} from '../server/gateway/types';
import { GatewayTestSuiteReport } from '../server/gateway/tests';

export interface GatewayHealthData {
  status: string;
  geminiClientConfigured: boolean;
  cacheStats: { size: number; maxEntries: number };
  spendingSummary: CostSummary;
  timestamp: string;
}

export class AIUsageGatewayClient {
  private baseUrl = '';

  /**
   * Executes an AI operation through the centralized server-side Gateway.
   */
  async execute(
    payload: GatewayRequestPayload,
    userId: string,
    isDemo: boolean = false
  ): Promise<GatewayExecuteResponse> {
    try {
      const effectiveUserId = userId || 'demo-user-guest';
      const authHeader = isDemo || effectiveUserId.startsWith('demo-') ? 'Bearer demo-mode' : `Bearer ${effectiveUserId}`;
      const response = await fetch(`${this.baseUrl}/api/gateway/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...payload,
          userId: effectiveUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          workflow: payload.workflow,
          modelId: 'gemini-3.8-flash',
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          estimatedCostUsd: 0,
          cacheHit: false,
          durationMs: 0,
          error: errorData.error || `Server HTTP ${response.status}`,
          errorCode: errorData.errorCode || 'GEMINI_ERROR',
        };
      }

      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        workflow: payload.workflow,
        modelId: 'gemini-3.8-flash',
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        estimatedCostUsd: 0,
        cacheHit: false,
        durationMs: 0,
        error: err.message || 'Network error reaching AI Usage Gateway',
        errorCode: 'GEMINI_ERROR',
      };
    }
  }

  /**
   * Fetches the current user's quotas for display in UI.
   */
  async getQuotas(userId: string, eventId?: string): Promise<QuotaStatus[]> {
    try {
      const q = new URLSearchParams({ userId });
      if (eventId) q.append('eventId', eventId);
      const res = await fetch(`${this.baseUrl}/api/gateway/quotas?${q.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.quotas || [];
    } catch (e) {
      console.warn('Could not load quotas:', e);
      return [];
    }
  }

  /**
   * Fetches recent usage logs and cost metrics for governance dashboard.
   */
  async getUsageLogs(userId?: string): Promise<{
    summary: CostSummary;
    logs: AIUsageLogEntry[];
    metricsByWorkflow: Record<string, any>;
  }> {
    try {
      const q = userId ? `?userId=${userId}` : '';
      const res = await fetch(`${this.baseUrl}/api/gateway/usage${q}`);
      if (!res.ok) throw new Error('Failed to fetch usage logs');
      return await res.json();
    } catch (e) {
      return {
        summary: {
          totalSpentUsd: 0,
          projectBudgetLimitUsd: 10,
          remainingBudgetUsd: 10,
          isBudgetExhausted: false,
          totalRequestsCount: 0,
          successfulRequestsCount: 0,
          failedRequestsCount: 0,
          cacheHitRatio: 0,
        },
        logs: [],
        metricsByWorkflow: {},
      };
    }
  }

  /**
   * Fetches Gateway Health & Status.
   */
  async getHealth(): Promise<GatewayHealthData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/gateway/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  /**
   * Runs the automated test suite directly through the server gateway endpoint.
   */
  async runTests(): Promise<GatewayTestSuiteReport> {
    const res = await fetch(`${this.baseUrl}/api/gateway/run-tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to execute test suite: HTTP ${res.status}`);
    }
    return await res.json();
  }
}

export const aiGatewayClient = new AIUsageGatewayClient();
