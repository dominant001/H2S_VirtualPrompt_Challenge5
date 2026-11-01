/**
 * Utsav AI — Phase 3: Event Architect Client Service
 * Connects frontend UI to server-side conversational intake & Gateway
 */

import {
  ArchitectChatMessage,
  EventIntakeDraft,
  IntakeProcessResult,
} from '../server/architect/types';

export class EventArchitectClient {
  /**
   * Send a conversational message to the Event Architect
   */
  public async sendMessage(
    messages: ArchitectChatMessage[],
    currentDraft?: Partial<EventIntakeDraft>,
    authToken?: string
  ): Promise<IntakeProcessResult> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: authToken ? (authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`) : 'Bearer demo-user-guest',
      };

      const res = await fetch('/api/ai/event-intake/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages,
          currentDraft,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: unknown) {
      console.warn('[EventArchitectClient] Network or server error, providing client fallback:', err);
      // Client-side fallback if server is unreachable
      const latestMsg = messages[messages.length - 1]?.content || '';
      return {
        replyText: `I have received your request for: "${latestMsg}". *(Demo simulation — Gemini integration comes later. Network fallback active)*`,
        draft: {
          eventType: 'wedding',
          title: 'Jaipur Wedding Celebration',
          city: 'Jaipur',
          hasExactDate: false,
          eventDate: null,
          eventDateWindow: 'Date to be confirmed',
          guestCount: 200,
          budgetINR: 1200000,
          foodPreference: 'vegetarian',
          tier: 'standard',
          functionCount: 2,
          venueType: 'Heritage Lawn',
          accommodationNeeded: true,
          assumptions: ['Assuming 200 guests with vegetarian catering', 'Date marked tentative'],
          missingFields: ['eventDate'],
          confidence: 80,
          ...(currentDraft || {}),
        },
        followUpQuestions: ['Date to be confirmed', 'Prefer Heritage Resort', 'Review budget split'],
        isComplete: true,
        simulated: true,
        notice: 'Client offline fallback active',
      };
    }
  }

  /**
   * Run the Phase 3 Acceptance Test Suite
   */
  public async runAcceptanceTests(): Promise<any> {
    const res = await fetch('/api/ai/event-intake/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  }
}

export const eventArchitectClient = new EventArchitectClient();
