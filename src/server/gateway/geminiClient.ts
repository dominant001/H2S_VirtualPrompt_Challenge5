import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { GATEWAY_CONFIG } from './config';
import { ModelRouteConfig } from './types';

export class GeminiClient {
  private client: GoogleGenAI | null = null;
  private apiKeyPresent: boolean = false;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        this.apiKeyPresent = true;
      } catch (err) {
        console.warn('[GeminiClient] Could not initialize GoogleGenAI client:', err);
        this.client = null;
        this.apiKeyPresent = false;
      }
    } else {
      this.client = null;
      this.apiKeyPresent = false;
    }
  }

  public isAvailable(): boolean {
    return this.apiKeyPresent && this.client !== null;
  }

  /**
   * Calls Gemini models server-side with timeout protection and thinkingLevel configuration.
   */
  public async generateText(
    routeConfig: ModelRouteConfig,
    prompt: string,
    systemInstruction?: string
  ): Promise<{ text: string; rawResponse?: any; simulated: boolean }> {
    // Re-check client in case environment variable was injected dynamically
    if (!this.client) {
      this.initClient();
    }

    if (!this.client) {
      // Graceful fallback simulation when GEMINI_API_KEY is not yet attached by user
      const simulatedText = this.generateFallbackResponse(routeConfig.workflow, prompt);
      return {
        text: `${simulatedText}\n\n*(Demo simulation — Gemini integration comes later. API key not configured on server.)*`,
        simulated: true,
      };
    }

    // Build configuration
    const config: Record<string, any> = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    // ThinkingLevel configuration for Gemini 3.8 / 4 series
    if (routeConfig.thinkingLevel === 'HIGH') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (routeConfig.thinkingLevel === 'LOW') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    const requestPromise = this.client.models.generateContent({
      model: routeConfig.primaryModelId,
      contents: prompt,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Gemini API call timed out after ${GATEWAY_CONFIG.REQUEST_TIMEOUT_MS}ms`));
      }, GATEWAY_CONFIG.REQUEST_TIMEOUT_MS);
    });

    try {
      const response = await Promise.race([requestPromise, timeoutPromise]);
      const extractedText = response.text || '';
      return {
        text: extractedText,
        rawResponse: response,
        simulated: false,
      };
    } catch (error: any) {
      console.error('[GeminiClient] Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * Domain-specific fallback responses for Indian celebration workflows
   * strictly adhering to the "Demo simulation" requirement.
   */
  private generateFallbackResponse(workflow: string, prompt: string): string {
    switch (workflow) {
      case 'CHECKLIST_GENERATION':
        return [
          '### Expanded Milestone Checklist (Demo Simulation)',
          '1. **Vendor Contract Lock**: Re-confirm mandap florist delivery slot (4 hours prior to ceremony).',
          '2. **F&B Service Guarantee**: Finalize exact live counter positioning with catering manager.',
          '3. **Guest Logistics**: Coordinate Rajasthan tourist taxi arrival schedules from Jaipur airport.',
          '4. **Pheras Arrangement**: Verify havan samagri, dry fruits, and garland refrigeration timing.',
        ].join('\n');

      case 'BUDGET_EXPLANATION':
      case 'COMPLEX_BUDGET_OPTIMIZATION':
        return [
          '### Budget Advisory & Reallocation Analysis (Demo Simulation)',
          '• **Per-plate baseline**: 200 guests × ₹900/plate = ₹1,80,000 + ₹20,000 extras = ₹2,00,000 catering allocation.',
          '• **Contingency absorption**: Absorbing guest increases from ₹1,80,000 contingency preserves the ₹12 Lakh total ceiling.',
          '• **Recommendation**: Keep photography (₹1,00,000) and decor (₹1,30,000) locked to prevent cost creeping.',
        ].join('\n');

      case 'INVITATION_WORDING':
        return [
          '### Traditional & Modern Indian Wedding Invitation (Demo Simulation)',
          '"With the divine blessings of Lord Ganesha and our elders,',
          'Sharma & Verma families cordially invite you to celebrate the wedding ceremony of',
          'Aarav & Meera.',
          'Join us for royal Rajasthani festivities in the pink city of Jaipur.',
          'Your presence and warm blessings are our greatest gifts."',
        ].join('\n');

      default:
        return `Utsav AI Copilot guidance for: "${prompt.slice(0, 100)}..."\n\nCarefully planned according to regional customs, timeline dependencies, and ₹12,00,000 budget allocations.`;
    }
  }
}

export const geminiClient = new GeminiClient();
