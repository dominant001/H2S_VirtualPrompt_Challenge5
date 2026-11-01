/**
 * Utsav AI — Phase 6: Natural Language Re-planning Intent Router
 * Classifies user instructions into structured intents and extracts parameters.
 * Routes through the AI Usage Gateway with deterministic fallback.
 */

import { ReplanIntentResult } from '../../types';
import { aiUsageGateway } from '../gateway/gateway';
import { IntentParser } from '../../domain/intentParser';

export class IntentRouter {
  /**
   * Deterministic rule-based intent parsing (used as primary fallback or offline mode)
   */
  public static parseDeterministic(text: string): ReplanIntentResult {
    return IntentParser.parse(text);
  }

  /**
   * Routes query through AI Usage Gateway when available, falling back to deterministic parser.
   */
  public static async classifyIntent(
    text: string,
    authHeader?: string,
    userId: string = 'demo-user-guest'
  ): Promise<ReplanIntentResult> {
    try {
      const response = await aiUsageGateway.execute(
        {
          workflow: 'RE_PLANNING',
          prompt: `Analyze this wedding event re-planning request and return structured JSON.
Supported intents: UPDATE_GUESTS, UPDATE_BUDGET, CHANGE_DATE, ADD_FUNCTION, UPDATE_VENDOR_QUOTE, ADD_TASK, ASK_STATUS, CLARIFICATION_NEEDED.

User Request: "${text}"

Respond with ONLY valid JSON:
{
  "intent": "UPDATE_GUESTS",
  "confidence": 0.95,
  "explanation": "Brief explanation",
  "extractedParameters": { "newGuestCount": 250, "preserveBudget": true }
}`,
        },
        { userId, isDemoUser: false },
        authHeader
      );

      if (response.success && response.text) {
        try {
          const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.intent) {
            return {
              intent: parsed.intent,
              confidence: parsed.confidence || 0.9,
              explanation: parsed.explanation || 'Classified via AI Usage Gateway',
              extractedParameters: parsed.extractedParameters || {},
              simulated: false,
            };
          }
        } catch {
          // JSON parsing failed, use deterministic fallback
        }
      }
    } catch {
      // Gateway error or offline mode, fall back seamlessly
    }

    return IntentParser.parse(text);
  }
}
