/**
 * Utsav AI — Phase 6: Deterministic Re-planning Intent Parser
 * Pure domain parser for offline/demo/testing and baseline classification.
 */

import { ReplanIntentResult } from '../types';

export class IntentParser {
  public static parse(text: string): ReplanIntentResult {
    const lower = text.toLowerCase().trim();

    // 1. UPDATE_GUESTS
    const guestMatch = lower.match(
      /(?:increase|decrease|change|update|set)?\s*(?:guests?|attendance|people|pax)?\s*(?:from\s*(\d+))?\s*(?:to\s*|is\s*)?(\d+)\s*(?:guests?|people|pax)?/i
    );
    const guestNumber250 = lower.includes('250') || (guestMatch && parseInt(guestMatch[2], 10) === 250);

    if (
      guestNumber250 ||
      (lower.includes('guest') && (lower.includes('increase') || lower.includes('decrease') || lower.includes('to ')))
    ) {
      const targetGuestCount = guestNumber250 ? 250 : guestMatch ? parseInt(guestMatch[2], 10) : 250;
      return {
        intent: 'UPDATE_GUESTS',
        confidence: 0.98,
        explanation: `Parsed guest count adjustment to ${targetGuestCount} guests.`,
        extractedParameters: {
          newGuestCount: targetGuestCount,
          preserveBudget: lower.includes('keep') || lower.includes('budget') || lower.includes('12 lakh'),
        },
        simulated: true,
      };
    }

    // 2. UPDATE_BUDGET
    if (
      lower.includes('budget') &&
      (lower.includes('increase') || lower.includes('decrease') || lower.includes('lakh') || lower.includes('crore'))
    ) {
      const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)/i);
      const targetBudget = lakhMatch ? parseFloat(lakhMatch[1]) * 100000 : undefined;
      return {
        intent: 'UPDATE_BUDGET',
        confidence: 0.92,
        explanation: `Parsed budget ceiling adjustment request.`,
        extractedParameters: {
          targetBudgetINR: targetBudget,
        },
        simulated: true,
      };
    }

    // 3. CHANGE_DATE
    if (
      lower.includes('date') ||
      lower.includes('postpone') ||
      lower.includes('prepone') ||
      lower.includes('december') ||
      lower.includes('november')
    ) {
      return {
        intent: 'CHANGE_DATE',
        confidence: 0.88,
        explanation: `Parsed wedding celebration date revision.`,
        extractedParameters: {
          rawDateString: text,
        },
        simulated: true,
      };
    }

    // 4. ADD_FUNCTION
    if (
      lower.includes('add function') ||
      lower.includes('add sangeet') ||
      lower.includes('add haldi') ||
      lower.includes('cocktail')
    ) {
      return {
        intent: 'ADD_FUNCTION',
        confidence: 0.94,
        explanation: `Parsed request to add a new event function.`,
        extractedParameters: {
          functionName: lower.includes('cocktail') ? 'Cocktail Party' : 'Additional Function',
        },
        simulated: true,
      };
    }

    // 5. UPDATE_VENDOR_QUOTE
    if (
      lower.includes('quote') ||
      lower.includes('vendor rate') ||
      lower.includes('caterer rate') ||
      lower.includes('photographer')
    ) {
      return {
        intent: 'UPDATE_VENDOR_QUOTE',
        confidence: 0.9,
        explanation: `Parsed vendor quote rate update.`,
        extractedParameters: {
          rawQuote: text,
        },
        simulated: true,
      };
    }

    // 6. ADD_TASK
    if (lower.includes('add task') || lower.includes('remind me') || lower.includes('checklist item')) {
      return {
        intent: 'ADD_TASK',
        confidence: 0.89,
        explanation: `Parsed task creation intent.`,
        extractedParameters: {
          taskDescription: text,
        },
        simulated: true,
      };
    }

    // 7. ASK_STATUS
    if (
      lower.includes('status') ||
      lower.includes('reserve') ||
      lower.includes('how much') ||
      lower.includes('breakdown')
    ) {
      return {
        intent: 'ASK_STATUS',
        confidence: 0.91,
        explanation: `Parsed status/budget inquiry query.`,
        extractedParameters: {},
        simulated: true,
      };
    }

    // Ambiguous -> CLARIFICATION_NEEDED
    return {
      intent: 'CLARIFICATION_NEEDED',
      confidence: 0.4,
      explanation: 'Instruction was ambiguous. Clarification requested to ensure safety.',
      extractedParameters: {},
      clarificationPrompt:
        'Could you please specify whether you want to adjust guest count, reallocate budget, change date, or add a checklist task?',
      suggestedQuickActions: [
        { label: 'Simulate guest count increase (preserve budget)', action: 'simulate_guest_increase' },
        { label: 'Review Contingency Reserve status', action: 'ask_reserve_status' },
      ],
      simulated: true,
    };
  }
}
