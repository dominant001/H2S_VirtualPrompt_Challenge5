/**
 * Utsav AI — Phase 3: Gemini Event Architect & Conversational Intake Types
 */

import { EventTier, EventType, FoodPreference } from '../../types';

export interface EventIntakeDraft {
  eventType: EventType;
  title: string;
  city: string;
  state?: string;
  hasExactDate: boolean;
  eventDate?: string | null; // ISO YYYY-MM-DD or null if unspecified
  eventDateWindow?: string; // e.g. "Winter 2026", "November 2026", "To be confirmed"
  guestCount: number;
  budgetINR: number;
  foodPreference: FoodPreference;
  tier: EventTier;
  functionCount: number;
  functions?: string[]; // e.g. ['Haldi', 'Mehendi', 'Sangeet', 'Wedding Ceremony', 'Reception']
  venueType: string; // e.g. 'Heritage Resort Lawn', 'Banquet Hall', 'Community Grounds'
  accommodationNeeded: boolean;
  traditions?: string[]; // e.g. ['Rajasthani / Marwari', 'North Indian']
  preferences?: string[]; // e.g. ['Vegetarian food only', 'Live acoustic music']
  assumptions: string[]; // Explicit assumptions stated to the user
  missingFields: string[]; // High-impact fields still needed: 'eventDate', 'city', 'budgetINR', etc.
  confidence: number; // 0 to 100 percentage
  readOnlySummary?: string;
}

export interface ArchitectChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  suggestedFollowUps?: string[];
  isSimulated?: boolean;
}

export interface IntakeProcessResult {
  replyText: string;
  draft: EventIntakeDraft;
  followUpQuestions: string[];
  isComplete: boolean;
  simulated: boolean;
  notice?: string;
  error?: string;
}

export interface BlueprintRecommendation {
  suggestedBudgetBreakdown: Array<{
    category: string;
    percentage: number;
    amountINR: number;
    notes: string;
  }>;
  suggestedMilestones: Array<{
    title: string;
    relativeWindow: string;
    description: string;
  }>;
  traditionHighlights: string[];
  architectAdvice: string;
}
