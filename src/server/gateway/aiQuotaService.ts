import { INITIAL_QUOTA_POLICIES, WORKFLOW_TO_QUOTA_KEY } from './config';
import { AIWorkflow, QuotaPolicy, QuotaStatus } from './types';

interface DailyQuotaUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

export class AIQuotaService {
  private policies: Map<string, QuotaPolicy> = new Map();
  // key: `${scope}:${targetId}:${policyKey}` -> DailyQuotaUsage
  private usageStore: Map<string, DailyQuotaUsage> = new Map();

  constructor() {
    Object.entries(INITIAL_QUOTA_POLICIES).forEach(([k, policy]) => {
      this.policies.set(k, { ...policy });
    });
  }

  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private buildStoreKey(policyKey: string, userId: string, eventId?: string): string {
    const policy = this.policies.get(policyKey);
    if (!policy) {
      return `user:${userId}:${policyKey}`;
    }
    if (policy.scope === 'event' && eventId) {
      return `event:${eventId}:${policyKey}`;
    }
    return `user:${userId}:${policyKey}`;
  }

  /**
   * Resolves the policy key associated with a workflow.
   */
  public getPolicyKeyForWorkflow(workflow: AIWorkflow): string {
    return WORKFLOW_TO_QUOTA_KEY[workflow] || 'GENERAL_CHAT';
  }

  /**
   * Atomically checks if the quota allows this workflow invocation.
   */
  public checkQuota(
    workflow: AIWorkflow,
    userId: string,
    eventId?: string
  ): { allowed: boolean; status: QuotaStatus; error?: string } {
    const policyKey = this.getPolicyKeyForWorkflow(workflow);
    const policy = this.policies.get(policyKey);

    if (!policy) {
      return {
        allowed: true,
        status: {
          key: policyKey,
          dailyLimit: 999,
          usedToday: 0,
          remainingToday: 999,
          resetsAt: this.getEndOfDayIso(),
        },
      };
    }

    if (!policy.enabled) {
      return {
        allowed: false,
        status: {
          key: policyKey,
          dailyLimit: 0,
          usedToday: 0,
          remainingToday: 0,
          resetsAt: this.getEndOfDayIso(),
        },
        error: `Feature "${policy.name}" is currently disabled in policy configuration.`,
      };
    }

    const today = this.getTodayKey();
    const storeKey = this.buildStoreKey(policyKey, userId, eventId);
    const current = this.usageStore.get(storeKey);

    let usedToday = 0;
    if (current && current.date === today) {
      usedToday = current.count;
    }

    const remaining = Math.max(0, policy.dailyLimit - usedToday);
    const allowed = usedToday < policy.dailyLimit;

    const status: QuotaStatus = {
      key: policyKey,
      dailyLimit: policy.dailyLimit,
      usedToday,
      remainingToday: remaining,
      resetsAt: this.getEndOfDayIso(),
    };

    if (!allowed) {
      const scopeLabel = policy.scope === 'event' ? 'this celebration' : 'your user account';
      return {
        allowed: false,
        status,
        error: `Daily quota exceeded for ${policy.name} (${usedToday}/${policy.dailyLimit} requests for ${scopeLabel}). Quota resets at midnight.`,
      };
    }

    return { allowed: true, status };
  }

  /**
   * Atomically increments usage upon successful or billable execution.
   */
  public incrementQuota(workflow: AIWorkflow, userId: string, eventId?: string): QuotaStatus {
    const policyKey = this.getPolicyKeyForWorkflow(workflow);
    const policy = this.policies.get(policyKey) || {
      key: policyKey,
      dailyLimit: 999,
      enabled: true,
      name: policyKey,
      description: '',
      scope: 'user',
    };

    const today = this.getTodayKey();
    const storeKey = this.buildStoreKey(policyKey, userId, eventId);
    const current = this.usageStore.get(storeKey);

    let newCount = 1;
    if (current && current.date === today) {
      newCount = current.count + 1;
    }

    this.usageStore.set(storeKey, { date: today, count: newCount });

    return {
      key: policyKey,
      dailyLimit: policy.dailyLimit,
      usedToday: newCount,
      remainingToday: Math.max(0, policy.dailyLimit - newCount),
      resetsAt: this.getEndOfDayIso(),
    };
  }

  /**
   * Retrieves all quota statuses for a given user and optional active event.
   */
  public getAllStatuses(userId: string, eventId?: string): QuotaStatus[] {
    const today = this.getTodayKey();
    return Array.from(this.policies.values()).map((policy) => {
      const storeKey = this.buildStoreKey(policy.key, userId, eventId);
      const current = this.usageStore.get(storeKey);
      const usedToday = current && current.date === today ? current.count : 0;
      return {
        key: policy.key,
        dailyLimit: policy.dailyLimit,
        usedToday,
        remainingToday: Math.max(0, policy.dailyLimit - usedToday),
        resetsAt: this.getEndOfDayIso(),
      };
    });
  }

  /**
   * Configuration updates (admin/testing)
   */
  public setDailyLimit(policyKey: string, newLimit: number): void {
    const policy = this.policies.get(policyKey);
    if (policy && newLimit >= 0) {
      policy.dailyLimit = newLimit;
    }
  }

  public getEndOfDayIso(): string {
    const d = new Date();
    d.setUTCHours(23, 59, 59, 999);
    return d.toISOString();
  }

  public resetForTesting(): void {
    this.usageStore.clear();
  }
}

export const aiQuotaService = new AIQuotaService();
