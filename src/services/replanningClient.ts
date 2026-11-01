/**
 * Utsav AI — Phase 6: Client API for Cross-Feature Re-planning
 * Communicates with /api/replanning endpoints with offline fallback.
 */

import {
  BudgetCategory,
  ChangeProposal,
  EventModel,
  ReplanIntentResult,
  TaskItem,
} from '../types';
import { ReplanningEngine } from '../domain/replanningEngine';
import { IntentParser } from '../domain/intentParser';

export class ReplanningClient {
  public async analyzeIntent(
    text: string,
    event?: EventModel,
    categories?: BudgetCategory[],
    tasks?: TaskItem[],
    authToken?: string
  ): Promise<ReplanIntentResult> {
    try {
      const res = await fetch('/api/replanning/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? (authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`) : 'Bearer demo-user-guest',
        },
        body: JSON.stringify({ text, event, categories, tasks }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    // Local deterministic fallback
    const result = IntentParser.parse(text);
    if (result.intent === 'UPDATE_GUESTS' && event && categories && tasks) {
      result.proposal = ReplanningEngine.generateGuestProposal(
        event,
        categories,
        tasks,
        result.extractedParameters.newGuestCount || 250
      );
    }
    return result;
  }

  public async createProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    targetGuestCount: number = 250,
    idempotencyKey?: string
  ): Promise<ChangeProposal> {
    try {
      const res = await fetch('/api/replanning/proposal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, categories, tasks, targetGuestCount, idempotencyKey }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return ReplanningEngine.generateGuestProposal(
      event,
      categories,
      tasks,
      targetGuestCount,
      idempotencyKey
    );
  }

  public async approveProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    proposal: ChangeProposal,
    options: {
      selectedTaskIds?: string[];
      alternativeId?: string;
      userId?: string;
      role?: 'owner' | 'editor' | 'viewer';
    } = {}
  ) {
    try {
      const res = await fetch('/api/replanning/proposal/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          categories,
          tasks,
          proposalId: proposal.id,
          idempotencyKey: proposal.idempotencyKey,
          userContext: {
            userId: options.userId || 'sharma-admin',
            role: options.role || 'owner',
          },
          selectedTaskIds: options.selectedTaskIds,
          alternativeId: options.alternativeId,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return ReplanningEngine.approveProposal(event, categories, tasks, proposal, {
      selectedTaskIds: options.selectedTaskIds,
      alternativeId: options.alternativeId,
      approvedBy: options.userId || 'sharma-admin',
      idempotencyKey: proposal.idempotencyKey,
    });
  }

  public async rejectProposal(
    proposal: ChangeProposal,
    reason?: string,
    userId?: string
  ) {
    try {
      const res = await fetch('/api/replanning/proposal/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          reason,
          userContext: { userId: userId || 'sharma-admin', role: 'owner' },
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return {
      success: true,
      proposal: ReplanningEngine.rejectProposal(proposal, reason).updatedProposal,
      message: 'Proposal rejected locally in demo simulation mode.',
    };
  }

  public async runTests() {
    const res = await fetch('/api/replanning/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Test endpoint returned status ${res.status}`);
    }
    return await res.json();
  }
}

export const replanningClient = new ReplanningClient();
