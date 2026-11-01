import { AIUsageLogEntry, AIWorkflow } from './types';

export class AIUsageTracker {
  private logs: AIUsageLogEntry[] = [];
  private maxLogs: number = 2000;

  /**
   * Logs an AI gateway execution with full auditing metadata.
   */
  public logRequest(entry: Omit<AIUsageLogEntry, 'id'>): AIUsageLogEntry {
    const fullEntry: AIUsageLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return fullEntry;
  }

  /**
   * Query recent logs with filtering.
   */
  public getRecentLogs(limit: number = 50, userId?: string, eventId?: string): AIUsageLogEntry[] {
    let filtered = this.logs;
    if (userId) {
      filtered = filtered.filter((l) => l.userId === userId);
    }
    if (eventId) {
      filtered = filtered.filter((l) => l.eventId === eventId);
    }
    return filtered.slice(0, limit);
  }

  /**
   * Aggregates usage metrics by workflow.
   */
  public getMetricsByWorkflow(): Record<
    AIWorkflow,
    { count: number; totalCostUsd: number; totalTokens: number; successRate: number }
  > {
    const metrics: Partial<
      Record<
        AIWorkflow,
        { count: number; successCount: number; totalCostUsd: number; totalTokens: number }
      >
    > = {};

    for (const log of this.logs) {
      if (!metrics[log.workflow]) {
        metrics[log.workflow] = {
          count: 0,
          successCount: 0,
          totalCostUsd: 0,
          totalTokens: 0,
        };
      }
      const m = metrics[log.workflow]!;
      m.count += 1;
      if (log.status === 'SUCCESS') m.successCount += 1;
      m.totalCostUsd += log.estimatedCostUsd;
      m.totalTokens += log.inputTokens + log.outputTokens;
    }

    const result: Record<string, { count: number; totalCostUsd: number; totalTokens: number; successRate: number }> = {};
    for (const [w, m] of Object.entries(metrics)) {
      result[w] = {
        count: m.count,
        totalCostUsd: Math.round(m.totalCostUsd * 10000) / 10000,
        totalTokens: m.totalTokens,
        successRate: m.count > 0 ? Math.round((m.successCount / m.count) * 100) : 100,
      };
    }

    return result;
  }

  public resetForTesting(): void {
    this.logs = [];
  }
}

export const aiUsageTracker = new AIUsageTracker();
