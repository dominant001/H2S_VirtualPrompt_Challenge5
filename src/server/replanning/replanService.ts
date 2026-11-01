/**
 * Utsav AI — Phase 6: Authenticated Re-planning Service & Tool Interfaces
 * Manages proposals, version tracking, idempotency deduplication, and transactional application.
 */

import {
  BudgetCategory,
  ChangeProposal,
  EventModel,
  ReplanAuditLogEntry,
  TaskItem,
} from '../../types';
import { BudgetEngine } from '../../domain/budgetEngine';
import { ApproveProposalResult, ReplanningEngine } from '../../domain/replanningEngine';

export interface UserContext {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  email?: string;
}

export class ReplanService {
  private proposals: Map<string, ChangeProposal> = new Map();
  private auditLogs: ReplanAuditLogEntry[] = [];
  private appliedIdempotencyKeys: Set<string> = new Set();

  /**
   * Tool: getEvent(eventId)
   */
  public getEvent(event: EventModel): EventModel {
    return { ...event };
  }

  /**
   * Tool: getBudgetSummary(eventId)
   */
  public getBudgetSummary(event: EventModel, categories: BudgetCategory[]) {
    return BudgetEngine.getBudgetAnalysis(event, categories);
  }

  /**
   * Tool: calculateScenario(eventId, scenarioParams)
   */
  public calculateScenario(
    event: EventModel,
    categories: BudgetCategory[],
    guestCount: number,
    plateRate?: number
  ) {
    return BudgetEngine.getBudgetAnalysis(event, categories, {
      guestCount,
      plateRate: plateRate || event.cateringModel.sampleRatePerPlate || 900,
      stressPercentage: 0,
    });
  }

  /**
   * Tool: createChangeProposal
   */
  public createChangeProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    targetGuestCount?: number,
    customIdempotencyKey?: string
  ): ChangeProposal {
    const defaultTarget = Math.round((event.guestCount || 50) * 1.25);
    const resolvedTarget = targetGuestCount || defaultTarget;
    const proposal = ReplanningEngine.generateGuestProposal(
      event,
      categories,
      tasks,
      resolvedTarget,
      customIdempotencyKey
    );
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  /**
   * Tool: approveProposal(proposalId, idempotencyKey, userContext)
   */
  public approveProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    proposalId: string,
    idempotencyKey?: string,
    userContext?: UserContext,
    options: {
      selectedTaskIds?: string[];
      alternativeId?: string;
    } = {}
  ): ApproveProposalResult {
    // Role check: viewers cannot write
    if (userContext && userContext.role === 'viewer') {
      return {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Permission denied: Viewers cannot approve budget or event change proposals.',
        updatedEvent: event,
        updatedCategories: categories,
        updatedTasks: tasks,
        updatedProposal: this.proposals.get(proposalId) || ({} as ChangeProposal),
      };
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        success: false,
        error: 'INVALID_PROPOSAL',
        message: `Proposal with id ${proposalId} not found.`,
        updatedEvent: event,
        updatedCategories: categories,
        updatedTasks: tasks,
        updatedProposal: {} as ChangeProposal,
      };
    }

    const effectiveKey = idempotencyKey || proposal.idempotencyKey;

    const result = ReplanningEngine.approveProposal(event, categories, tasks, proposal, {
      selectedTaskIds: options.selectedTaskIds,
      alternativeId: options.alternativeId,
      approvedBy: userContext?.userId || 'authorized-user',
      idempotencyKey: effectiveKey,
      appliedKeysSet: this.appliedIdempotencyKeys,
    });

    if (result.success) {
      this.proposals.set(result.updatedProposal.id, result.updatedProposal);
      if (effectiveKey) {
        this.appliedIdempotencyKeys.add(effectiveKey);
      }
      if (result.auditEntry) {
        this.auditLogs.unshift(result.auditEntry);
      }
    }

    return result;
  }

  /**
   * Tool: rejectProposal(proposalId, reason, userContext)
   */
  public rejectProposal(
    proposalId: string,
    reason?: string,
    userContext?: UserContext
  ): {
    success: boolean;
    proposal?: ChangeProposal;
    message: string;
  } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        success: false,
        message: `Proposal ${proposalId} not found.`,
      };
    }

    const result = ReplanningEngine.rejectProposal(proposal, reason);
    this.proposals.set(result.updatedProposal.id, result.updatedProposal);

    return {
      success: true,
      proposal: result.updatedProposal,
      message: 'Proposal successfully rejected. No event or budget changes made.',
    };
  }

  public getProposal(proposalId: string): ChangeProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public getAuditLogs(): ReplanAuditLogEntry[] {
    return [...this.auditLogs];
  }

  public resetMemory(): void {
    this.proposals.clear();
    this.auditLogs = [];
    this.appliedIdempotencyKeys.clear();
  }
}

export const replanService = new ReplanService();
