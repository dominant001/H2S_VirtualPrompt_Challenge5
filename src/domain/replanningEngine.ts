/**
 * Utsav AI — Phase 6: Cross-Feature Intelligent Re-planning Engine
 * Connects language understanding, deterministic budget calculations,
 * and task impact analysis into a safe, transparent, approval-gated workflow.
 */

import {
  BudgetCategory,
  ChangeProposal,
  EventModel,
  ReplanAlternative,
  ReplanAuditLogEntry,
  TaskItem,
  TaskModificationProposal,
} from '../types';
import { BudgetEngine } from './budgetEngine';
import { Money } from './money';
import { formatINR } from '../utils/currency';

export interface ApproveProposalResult {
  success: boolean;
  error?: 'VERSION_CONFLICT' | 'ALREADY_APPLIED' | 'UNAUTHORIZED' | 'INVALID_PROPOSAL';
  message: string;
  updatedEvent: EventModel;
  updatedCategories: BudgetCategory[];
  updatedTasks: TaskItem[];
  updatedProposal: ChangeProposal;
  auditEntry?: ReplanAuditLogEntry;
}

export class ReplanningEngine {
  /**
   * Generates a fully calculated, deterministic ChangeProposal for a guest count change.
   * E.g. 200 -> 250 guests with ₹12L total budget
   */
  public static generateGuestProposal(
    event: EventModel,
    categories: BudgetCategory[],
    currentTasks: TaskItem[],
    newGuestCount: number,
    customIdempotencyKey?: string
  ): ChangeProposal {
    const originalGuestCount = event.guestCount || 50;
    const plateRate =
      event.cateringModel?.sampleRatePerPlate ||
      (originalGuestCount > 0 ? Math.round((event.totalBudget * 0.25) / originalGuestCount) : 900);
    const extras = event.cateringModel?.sampleExtras ?? Math.round(event.totalBudget * 0.02);

    // Use deterministic integer-paise calculations
    const originalEstimate = BudgetEngine.estimateCatering({
      guestCount: originalGuestCount,
      chargeableCount: originalGuestCount,
      perPlateRate: plateRate,
      extraCounters: extras,
    });

    const revisedEstimate = BudgetEngine.estimateCatering({
      guestCount: newGuestCount,
      chargeableCount: newGuestCount,
      perPlateRate: plateRate,
      extraCounters: extras,
    });

    const difference = revisedEstimate.totalCostINR - originalEstimate.totalCostINR;

    // Find Contingency Reserve category
    const contingencyCategory = categories.find(
      (c) => c.isContingency || c.name.toLowerCase().includes('contingency')
    );
    const originalReserve = contingencyCategory ? contingencyCategory.allocated : 180000;
    const revisedReserve = Math.max(0, originalReserve - difference);

    // Alternatives
    const alternatives: ReplanAlternative[] = [
      {
        id: 'alt-reserve',
        title: 'Option A (Recommended): Absorb Overrun from Contingency Reserve',
        description: `Transfers ₹${difference.toLocaleString('en-IN')} from Contingency Reserve to Catering. Your total celebration budget remains strictly capped at ₹${event.totalBudget.toLocaleString('en-IN')}. Reserve remains healthy at ₹${revisedReserve.toLocaleString('en-IN')}.`,
        budgetDelta: 0,
        contingencyDelta: -difference,
        isRecommended: true,
      },
      {
        id: 'alt-expand',
        title: 'Option B: Expand Total Budget Ceiling',
        description: `Increases total budget from ₹${event.totalBudget.toLocaleString('en-IN')} to ₹${(event.totalBudget + difference).toLocaleString('en-IN')} to preserve the full ₹${originalReserve.toLocaleString('en-IN')} contingency cushion.`,
        budgetDelta: difference,
        contingencyDelta: 0,
        isRecommended: false,
      },
      {
        id: 'alt-rebalance',
        title: 'Option C: Rebalance Discretionary Decor & Favors',
        description: `Leaves reserve intact by reallocating ₹${difference.toLocaleString('en-IN')} from floral design and gift hampers.`,
        budgetDelta: 0,
        contingencyDelta: 0,
        isRecommended: false,
      },
    ];

    // Synchronized Task Impact Analysis (Event Type Aware)
    const isBirthday = event.type === 'birthday';
    const isCommunity = event.type === 'community';

    const taskModifications: TaskModificationProposal[] = isBirthday
      ? [
          {
            id: `tmod-${Date.now()}-1`,
            title: `Confirm party room & play zone capacity for ${newGuestCount} attendees`,
            categoryName: 'Venue & Play Area',
            action: 'flag_review',
            selected: true,
            reason: `Original guest count ${originalGuestCount} increased to ${newGuestCount}. Verify soft-play capacity limits with venue manager.`,
            vendorVerificationWarning: 'Venue capacity NOT confirmed. Hall manager verification required before committing.',
          },
          {
            id: `tmod-${Date.now()}-2`,
            title: `Recalculate birthday cake weight & kids snack stations for ${newGuestCount} guests`,
            categoryName: 'Catering & Beverages',
            action: 'flag_review',
            selected: true,
            reason: `Additional ${newGuestCount - originalGuestCount} guests require +${Math.max(1, Math.round((newGuestCount - originalGuestCount) * 0.1))} kg extra cake and second finger-food counter.`,
            vendorVerificationWarning: 'Baker capacity NOT confirmed. Custom designer cake orders require 48h advance confirmation.',
          },
          {
            id: `tmod-${Date.now()}-3`,
            title: `Order +${newGuestCount - originalGuestCount} personalized return gift hampers & party bags`,
            categoryName: 'Party Favors & Photography',
            action: 'update_count',
            selected: true,
            reason: `Need +${newGuestCount - originalGuestCount} gift sets for additional attending children with customized name badges.`,
            vendorVerificationWarning: 'Supplier stock NOT confirmed. Ensure gift assembly 3 days before party.',
          },
          {
            id: `tmod-${Date.now()}-4`,
            title: `Amend caterer minimum head-count guarantee contract to ${newGuestCount} plates`,
            categoryName: 'Catering & Beverages',
            action: 'update_milestone',
            selected: true,
            reason: `Lock contract head-count guarantee at ₹${plateRate}/plate before final billing cutoff.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Contractual quote is immutable without formal signed addendum.',
          },
          {
            id: `tmod-${Date.now()}-5`,
            title: `Check guest parking & arrival flow at ${event.city || 'party'} venue`,
            categoryName: 'Venue & Play Area',
            action: 'create_followup',
            selected: false,
            reason: `Estimated 8-10 additional vehicles arriving for birthday party.`,
            vendorVerificationWarning: 'Parking lot operator availability subject to venue valet.',
          },
        ]
      : isCommunity
      ? [
          {
            id: `tmod-${Date.now()}-1`,
            title: `Confirm public assembly ground & emergency egress for ${newGuestCount} attendees`,
            categoryName: 'Venue',
            action: 'flag_review',
            selected: true,
            reason: `Original attendance ${originalGuestCount} increased to ${newGuestCount}. Check municipal ground limit.`,
            vendorVerificationWarning: 'Authority clearance required for crowd capacity updates.',
          },
          {
            id: `tmod-${Date.now()}-2`,
            title: `Recalculate drinking water kiosks & seating chairs for ${newGuestCount} attendees`,
            categoryName: 'Logistics',
            action: 'flag_review',
            selected: true,
            reason: `Additional ${newGuestCount - originalGuestCount} attendees require additional rows of chairs and 2 water dispensers.`,
            vendorVerificationWarning: 'Tent house chair stock subject to booking reservation.',
          },
          {
            id: `tmod-${Date.now()}-3`,
            title: `Update digital flyer circulation & community notices`,
            categoryName: 'Communications',
            action: 'update_count',
            selected: true,
            reason: `Broadcast expanded attendance guidelines to neighborhood coordinators.`,
            vendorVerificationWarning: 'Notice dispatch scheduled through community WhatsApp roster.',
          },
          {
            id: `tmod-${Date.now()}-4`,
            title: `Amend community meal headcount guarantee to ${newGuestCount} servings`,
            categoryName: 'Catering',
            action: 'update_milestone',
            selected: true,
            reason: `Lock catering head guarantee with community langar/caterer before provisioning.`,
            vendorVerificationWarning: 'Ingredient procurement lead time of 3 days applies.',
          },
          {
            id: `tmod-${Date.now()}-5`,
            title: `Deploy +2 volunteer marshals for crowd entrance guiding`,
            categoryName: 'Logistics',
            action: 'create_followup',
            selected: false,
            reason: `Additional arrival cohort needs dedicated volunteers at entry gates.`,
            vendorVerificationWarning: 'Volunteer team lead confirmation required.',
          },
        ]
      : [
          {
            id: `tmod-${Date.now()}-1`,
            title: `Confirm venue banquet hall capacity & fire egress for ${newGuestCount} guests`,
            categoryName: 'Venue',
            action: 'flag_review',
            selected: true,
            reason: `Original guest count ${originalGuestCount} increased to ${newGuestCount}. Verify seating layout does not exceed hall license limit.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Hall manager verification required before committing.',
          },
          {
            id: `tmod-${Date.now()}-2`,
            title: `Recalculate dining hall table layout & buffet throughput for ${newGuestCount} guests`,
            categoryName: 'Catering',
            action: 'flag_review',
            selected: true,
            reason: `Additional ${newGuestCount - originalGuestCount} guests require 5 additional dining tables and second chafing dish line.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Live throughput subject to venue kitchen space.',
          },
          {
            id: `tmod-${Date.now()}-3`,
            title: `Recalculate boxed invitation printing batch & courier list`,
            categoryName: 'Invitations',
            action: 'update_count',
            selected: true,
            reason: `Need +${Math.ceil((newGuestCount - originalGuestCount) / 2)} invitation suites for additional family heads.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Printer lead time of 7 days applies. Check paper stock availability.',
          },
          {
            id: `tmod-${Date.now()}-4`,
            title: `Amend caterer minimum head-count guarantee contract to ${newGuestCount} plates`,
            categoryName: 'Catering',
            action: 'update_milestone',
            selected: true,
            reason: `Lock contract head-count guarantee at ₹${plateRate}/plate before final billing cutoff.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Contractual quote is immutable without formal signed addendum.',
          },
          {
            id: `tmod-${Date.now()}-5`,
            title: `Arrange additional guest pickup shuttles from ${event.city || 'local'} transit hubs & Airport`,
            categoryName: 'Logistics',
            action: 'create_followup',
            selected: false,
            reason: `Estimated 15-20 outstation arrivals in the expanded guest cohort.`,
            vendorVerificationWarning: 'Vendor capacity NOT confirmed. Cab operator fleet availability subject to booking.',
          },
        ];

    const affectedTaskTitles = taskModifications.map((t) => t.title);

    const warnings = [
      `Contingency reserve will decrease by ₹${difference.toLocaleString('en-IN')} (to ₹${revisedReserve.toLocaleString('en-IN')}).`,
      `Vendor capacity is unverified: Venue seating & caterer capacity must be confirmed directly with venue staff.`,
      `Vendor quotes are immutable: Changing numbers does not alter binding vendor contracts until formal addendums are issued.`,
    ];

    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = customIdempotencyKey || `idemp-${proposalId}`;

    return {
      id: proposalId,
      eventId: event.id,
      baseVersion: event.version || 1,
      title: `Increase guest count from ${originalGuestCount} to ${newGuestCount}`,
      intent: 'UPDATE_GUESTS',
      requestedChange: `Increase guests from ${originalGuestCount} to ${newGuestCount}, keep total ${event.type} celebration budget ${formatINR(event.totalBudget)}`,
      description: `Adjusting attendance to ${newGuestCount} guests increases food & beverage service by +₹${difference.toLocaleString('en-IN')}. Option A absorbs this overrun from Contingency Reserve, strictly maintaining the ₹${event.totalBudget.toLocaleString('en-IN')} celebration ceiling.`,
      impactSummary: {
        originalGuestCount,
        revisedGuestCount: newGuestCount,
        originalCateringCost: originalEstimate.totalCostINR,
        revisedCateringCost: revisedEstimate.totalCostINR,
        difference,
        originalReserve,
        revisedReserve,
        totalBudget: event.totalBudget,
        categoryDeltas: [
          {
            categoryId: 'cat-catering',
            name: 'Catering',
            currentAllocated: originalEstimate.totalCostINR,
            revisedAllocated: revisedEstimate.totalCostINR,
            delta: difference,
          },
          {
            categoryId: 'cat-contingency',
            name: 'Contingency Reserve',
            currentAllocated: originalReserve,
            revisedAllocated: revisedReserve,
            delta: -difference,
          },
        ],
      },
      affectedTaskTitles,
      taskModifications,
      alternatives,
      chosenAlternativeId: 'alt-reserve',
      warnings,
      sourceEvidenceRefs: ['ev-jaipur-catering-standard', 'ev-jaipur-venue-lawn'],
      resolutionType: 'use_reserve',
      status: 'pending',
      applied: false,
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Pure preview function: Computes the simulated event, categories, and tasks
   * without mutating the original state.
   */
  public static previewProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    proposal: ChangeProposal,
    alternativeId: string = 'alt-reserve'
  ): {
    previewEvent: EventModel;
    previewCategories: BudgetCategory[];
    previewTasks: TaskItem[];
  } {
    const { revisedGuestCount, revisedCateringCost, revisedReserve, difference, totalBudget } =
      proposal.impactSummary;

    const isExpand = alternativeId === 'alt-expand';
    const newTotalBudget = isExpand ? totalBudget + difference : totalBudget;

    const previewEvent: EventModel = {
      ...event,
      guestCount: revisedGuestCount,
      totalBudget: newTotalBudget,
      cateringModel: {
        ...event.cateringModel,
        chargeablePlates: revisedGuestCount,
      },
      version: event.version + 1,
    };

    const previewCategories = categories.map((cat) => {
      if (cat.name.toLowerCase().includes('catering')) {
        return {
          ...cat,
          allocated: revisedCateringCost,
          estimatedBase: revisedCateringCost,
          estimatedHigh: Math.round(revisedCateringCost * 1.1),
          notes: `[PREVIEW] +₹${difference.toLocaleString('en-IN')} for ${revisedGuestCount} guests`,
        };
      }
      if (cat.isContingency || cat.name.toLowerCase().includes('contingency')) {
        return {
          ...cat,
          allocated: isExpand ? cat.allocated : revisedReserve,
          notes: isExpand
            ? cat.notes
            : `[PREVIEW] Absorbs ₹${difference.toLocaleString('en-IN')} overrun`,
        };
      }
      return { ...cat };
    });

    const selectedModifications = (proposal.taskModifications || []).filter((m) => m.selected);
    const previewTasks: TaskItem[] = [...tasks];

    for (const mod of selectedModifications) {
      previewTasks.push({
        id: `task-preview-${mod.id}`,
        eventId: event.id,
        categoryId: mod.categoryName.toLowerCase(),
        categoryName: mod.categoryName,
        subcategoryName: 'Re-planning Action',
        title: mod.title,
        description: `${mod.reason} (Notice: ${mod.vendorVerificationWarning || 'Manual verification required.'})`,
        status: 'todo',
        priority: 'high',
        dependsOnIds: [],
        subtasks: [
          {
            id: `st-prev-1`,
            title: 'Verify physical capacity & contact vendor POC',
            completed: false,
          },
        ],
      });
    }

    return { previewEvent, previewCategories, previewTasks };
  }

  /**
   * Approves and commits a proposal atomically.
   * Enforces:
   * 1. Version checking (proposal.baseVersion === event.version)
   * 2. Idempotency (rejects if already applied or matching idempotencyKey seen)
   * 3. Selective task application (only selected taskModifications are created)
   * 4. Audit logging
   */
  public static approveProposal(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[],
    proposal: ChangeProposal,
    options: {
      selectedTaskIds?: string[];
      alternativeId?: string;
      approvedBy?: string;
      idempotencyKey?: string;
      appliedKeysSet?: Set<string>;
    } = {}
  ): ApproveProposalResult {
    // 1. Idempotency check
    const key = options.idempotencyKey || proposal.idempotencyKey;
    if (proposal.applied || (key && options.appliedKeysSet?.has(key))) {
      return {
        success: false,
        error: 'ALREADY_APPLIED',
        message: `Proposal ${proposal.id} (key: ${key}) has already been applied. Duplicate application prevented.`,
        updatedEvent: event,
        updatedCategories: categories,
        updatedTasks: tasks,
        updatedProposal: proposal,
      };
    }

    // 2. Base Version conflict check
    if (event.version !== proposal.baseVersion) {
      return {
        success: false,
        error: 'VERSION_CONFLICT',
        message: `Conflict: Proposal base version (${proposal.baseVersion}) does not match current event version (${event.version}). The event state was modified concurrently. Please refresh re-planning.`,
        updatedEvent: event,
        updatedCategories: categories,
        updatedTasks: tasks,
        updatedProposal: proposal,
      };
    }

    const altId = options.alternativeId || proposal.chosenAlternativeId || 'alt-reserve';
    const isExpand = altId === 'alt-expand';
    const { revisedGuestCount, revisedCateringCost, revisedReserve, difference, totalBudget } =
      proposal.impactSummary;

    // 3. Mutate Budget Categories
    const updatedCategories: BudgetCategory[] = categories.map((cat) => {
      if (cat.name.toLowerCase().includes('catering')) {
        return {
          ...cat,
          allocated: revisedCateringCost,
          estimatedBase: revisedCateringCost,
          estimatedHigh: Math.round(revisedCateringCost * 1.1),
          notes: `Updated by approved proposal ${proposal.id}: +₹${difference.toLocaleString('en-IN')} for ${revisedGuestCount} guests.`,
        };
      }
      if (cat.isContingency || cat.name.toLowerCase().includes('contingency')) {
        return {
          ...cat,
          allocated: isExpand ? cat.allocated : revisedReserve,
          notes: isExpand
            ? cat.notes
            : `Reduced by ₹${difference.toLocaleString('en-IN')} to absorb catering adjustment without increasing total budget.`,
        };
      }
      return { ...cat };
    });

    // 4. Update Event (Increment version)
    const newTotalBudget = isExpand ? totalBudget + difference : totalBudget;
    const newVersion = event.version + 1;
    const updatedEvent: EventModel = {
      ...event,
      guestCount: revisedGuestCount,
      totalBudget: newTotalBudget,
      cateringModel: {
        ...event.cateringModel,
        chargeablePlates: revisedGuestCount,
      },
      version: newVersion,
    };

    // 5. Selectively apply task modifications
    const explicitSelectedSet = options.selectedTaskIds
      ? new Set(options.selectedTaskIds)
      : null;

    const modificationsToApply = (proposal.taskModifications || []).filter((mod) => {
      if (explicitSelectedSet) {
        return explicitSelectedSet.has(mod.id);
      }
      return mod.selected;
    });

    const newTasks: TaskItem[] = modificationsToApply.map((mod, index) => ({
      id: `task-replan-${Date.now()}-${index}`,
      eventId: event.id,
      categoryId: mod.categoryName.toLowerCase(),
      categoryName: mod.categoryName,
      subcategoryName: 'Re-planning Review',
      title: mod.title,
      description: `${mod.reason}\n[Action: ${mod.action}] Notice: ${
        mod.vendorVerificationWarning || 'Vendor capacity NOT confirmed. Manual verification required.'
      }`,
      status: 'todo',
      priority: 'high',
      dueDate: event.eventDate,
      dependsOnIds: [],
      subtasks: [
        {
          id: `st-replan-${index}-1`,
          title: `Inspect and sign-off: ${mod.title}`,
          completed: false,
        },
        {
          id: `st-replan-${index}-2`,
          title: 'Confirm with vendor directly (Vendor capacity is unverified)',
          completed: false,
        },
      ],
    }));

    const updatedTasks: TaskItem[] = [...tasks, ...newTasks];

    // 6. Mark Proposal Approved
    const updatedProposal: ChangeProposal = {
      ...proposal,
      status: 'approved',
      applied: true,
      chosenAlternativeId: altId,
      appliedAt: new Date().toISOString(),
      reviewedBy: options.approvedBy || 'authorized-user',
    };

    // 7. Audit Log Entry
    const auditEntry: ReplanAuditLogEntry = {
      id: `audit-${Date.now()}`,
      proposalId: proposal.id,
      eventId: event.id,
      baseVersion: proposal.baseVersion,
      newVersion,
      intent: proposal.intent || 'UPDATE_GUESTS',
      approvedBy: options.approvedBy || 'authorized-user',
      approvedAt: updatedProposal.appliedAt!,
      idempotencyKey: key || proposal.id,
      changesSummary: `Guests: ${event.guestCount} -> ${revisedGuestCount}. Catering: ₹${proposal.impactSummary.originalCateringCost} -> ₹${revisedCateringCost}. Reserve: ₹${proposal.impactSummary.originalReserve} -> ₹${isExpand ? proposal.impactSummary.originalReserve : revisedReserve}. Total Budget: ₹${newTotalBudget}.`,
      budgetDeltaINR: isExpand ? difference : 0,
      contingencyDeltaINR: isExpand ? 0 : -difference,
      tasksModifiedCount: newTasks.length,
    };

    return {
      success: true,
      message: `Proposal ${proposal.id} successfully applied to version ${newVersion}. Total budget: ₹${newTotalBudget.toLocaleString('en-IN')}.`,
      updatedEvent,
      updatedCategories,
      updatedTasks,
      updatedProposal,
      auditEntry,
    };
  }

  /**
   * Rejects a proposal. Guarantees 0 changes to event, categories, or tasks.
   */
  public static rejectProposal(
    proposal: ChangeProposal,
    reason: string = 'User rejected proposal in review'
  ): {
    updatedProposal: ChangeProposal;
  } {
    return {
      updatedProposal: {
        ...proposal,
        status: 'rejected',
        applied: false,
        warnings: [...(proposal.warnings || []), `Rejected: ${reason}`],
      },
    };
  }
}
