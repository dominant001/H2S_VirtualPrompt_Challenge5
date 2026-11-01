/**
 * Utsav AI — Phase 3: Gemini Event Architect Intake Service
 * Orchestrates conversational requirement extraction through AI Usage Gateway
 */

import { aiUsageGateway } from '../gateway/gateway';
import { EVENT_ARCHITECT_SYSTEM_INSTRUCTION } from './prompts';
import {
  ArchitectChatMessage,
  EventIntakeDraft,
  IntakeProcessResult,
} from './types';

export class EventArchitectIntakeService {
  /**
   * Default initial draft state
   */
  public getInitialDraft(): EventIntakeDraft {
    return {
      eventType: 'wedding',
      title: 'Aarav & Meera’s Wedding',
      city: 'Jaipur',
      state: 'Rajasthan',
      hasExactDate: false,
      eventDate: null,
      eventDateWindow: 'Date to be confirmed',
      guestCount: 200,
      budgetINR: 1200000,
      foodPreference: 'vegetarian',
      tier: 'standard',
      functionCount: 2,
      functions: ['Sangeet & Mehendi', 'Wedding Ceremony & Feast'],
      venueType: 'Heritage Resort Lawn',
      accommodationNeeded: true,
      traditions: ['North Indian / Rajasthani'],
      preferences: ['Pure vegetarian catering', 'Heritage courtyard vibe'],
      assumptions: [
        'Assuming 1 main wedding ceremony with 200 guests',
        'Estimated catering based on standard Rajasthani thali packages',
        'Contingency reserve recommended at 15% (₹1,80,000)',
      ],
      missingFields: ['eventDate'],
      confidence: 85,
    };
  }

  /**
   * Process a conversational turn with user messages and current draft
   */
  public async processMessage(
    messages: ArchitectChatMessage[],
    currentDraft?: Partial<EventIntakeDraft>,
    authHeader?: string
  ): Promise<IntakeProcessResult> {
    const baseDraft = { ...this.getInitialDraft(), ...(currentDraft || {}) };
    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Build context-rich prompt for Gemini
    const conversationHistoryText = messages
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `
Current Extracted Event Draft:
${JSON.stringify(baseDraft, null, 2)}

Recent Conversation History:
${conversationHistoryText}

Latest User Input:
"${latestUserMessage}"

Extract updated celebration parameters from the latest input and conversational context.
Respect the user's language (English or Hindi).
If the user indicates date is not fixed or uncertain ("not sure", "not fixed", "tentative", "अगले साल", "तारीख तय नहीं"), set hasExactDate: false, eventDate: null, and eventDateWindow: "Date to be confirmed" or seasonal window.
Output ONLY a JSON block conforming to the system schema.
`.trim();

    try {
      const gatewayResponse = await aiUsageGateway.execute(
        {
          workflow: 'REQUIREMENT_EXTRACTION',
          prompt,
          systemInstruction: EVENT_ARCHITECT_SYSTEM_INSTRUCTION,
          contextData: {
            currentDraft: baseDraft,
            turnCount: messages.length,
          },
        },
        undefined,
        authHeader
      );

      if (gatewayResponse.success && gatewayResponse.text) {
        const parsed = this.parseArchitectResponse(gatewayResponse.text, baseDraft, latestUserMessage);
        return {
          replyText: parsed.replyText,
          draft: parsed.draft,
          followUpQuestions: parsed.followUpQuestions,
          isComplete: parsed.isComplete,
          simulated: gatewayResponse.tokenUsage.totalTokens === 0 || gatewayResponse.text.includes('Demo simulation'),
          notice: gatewayResponse.text.includes('Demo simulation')
            ? 'Demo simulation — Gemini integration comes later. (API key not configured on server or credits depleted)'
            : undefined,
        };
      } else {
        // Fallback simulation when gateway returns error (e.g. credits depleted 402, rate limited, etc.)
        console.warn('[EventArchitect] Gateway returned unfulfilled result, running rule-based simulation fallback:', gatewayResponse.error);
        return this.generateSimulatedIntake(latestUserMessage, baseDraft, gatewayResponse.error);
      }
    } catch (err: any) {
      console.warn('[EventArchitect] Exception caught in processMessage, activating graceful fallback:', err.message);
      return this.generateSimulatedIntake(latestUserMessage, baseDraft, err.message);
    }
  }

  /**
   * Safely extract JSON from model output or repair if truncated
   */
  private parseArchitectResponse(
    rawText: string,
    currentDraft: EventIntakeDraft,
    userQuery: string
  ): {
    replyText: string;
    draft: EventIntakeDraft;
    followUpQuestions: string[];
    isComplete: boolean;
  } {
    try {
      // 1. Look for ```json ... ``` blocks
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const textToParse = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

      const parsed = JSON.parse(textToParse);
      if (parsed && typeof parsed === 'object') {
        const sanitizedDraft = this.sanitizeDraft(parsed.draft || {}, currentDraft, userQuery);
        return {
          replyText: parsed.replyText || 'I have updated your event draft with your latest preferences.',
          draft: sanitizedDraft,
          followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
          isComplete: Boolean(parsed.isComplete),
        };
      }
    } catch (parseError) {
      console.warn('[EventArchitect] Could not parse direct JSON from LLM text, running pattern extraction:', parseError);
    }

    // Pattern extraction fallback
    return this.generateSimulatedIntake(userQuery, currentDraft);
  }

  /**
   * Sanitize and validate draft fields to enforce invariants
   */
  public sanitizeDraft(
    incoming: Partial<EventIntakeDraft>,
    fallback: EventIntakeDraft,
    userQuery: string
  ): EventIntakeDraft {
    const isTentativeDate =
      /not sure|tentative|to be confirmed|tbd|decide later|अगले साल|तारीख तय नहीं|पक्की नहीं/i.test(userQuery);

    let hasExactDate = incoming.hasExactDate ?? fallback.hasExactDate;
    let eventDate = incoming.eventDate ?? fallback.eventDate;
    let eventDateWindow = incoming.eventDateWindow || fallback.eventDateWindow || 'Date to be confirmed';

    if (isTentativeDate || incoming.eventDate === null || !incoming.eventDate) {
      hasExactDate = false;
      eventDate = null;
      if (!incoming.eventDateWindow) {
        eventDateWindow = 'Date to be confirmed';
      }
    }

    // Sanitize guest count
    let guestCount = Number(incoming.guestCount) || fallback.guestCount || 200;
    if (guestCount < 10) guestCount = 10;

    // Sanitize budget
    let budgetINR = Number(incoming.budgetINR) || fallback.budgetINR || 1200000;
    if (budgetINR < 20000) budgetINR = 20000;

    // Sanitize event type
    let eventType = incoming.eventType || fallback.eventType || 'wedding';
    if (!['wedding', 'birthday', 'community'].includes(eventType)) {
      eventType = 'wedding';
    }

    // Sanitize food preference
    let foodPreference = incoming.foodPreference || fallback.foodPreference || 'vegetarian';
    if (!['vegetarian', 'non-veg', 'jain', 'mixed'].includes(foodPreference)) {
      foodPreference = 'vegetarian';
    }

    // Sanitize tier
    let tier = incoming.tier || fallback.tier || 'standard';
    if (!['budget', 'standard', 'premium'].includes(tier)) {
      tier = 'standard';
    }

    const missingFields: string[] = [];
    if (!eventDate && !hasExactDate) missingFields.push('eventDate');
    if (!incoming.city && !fallback.city) missingFields.push('city');

    return {
      eventType,
      title: incoming.title || fallback.title || 'Family Celebration',
      city: incoming.city || fallback.city || 'Jaipur',
      state: incoming.state || fallback.state || 'Rajasthan',
      hasExactDate,
      eventDate: hasExactDate ? eventDate : null,
      eventDateWindow,
      guestCount,
      budgetINR,
      foodPreference,
      tier,
      functionCount: Number(incoming.functionCount) || fallback.functionCount || 2,
      functions: incoming.functions || fallback.functions || ['Celebration Ceremony', 'Banquet Feast'],
      venueType: incoming.venueType || fallback.venueType || 'Banquet / Lawn',
      accommodationNeeded: incoming.accommodationNeeded ?? fallback.accommodationNeeded ?? true,
      traditions: incoming.traditions || fallback.traditions || ['Regional Indian Traditions'],
      preferences: incoming.preferences || fallback.preferences || [],
      assumptions: incoming.assumptions || [
        `Assuming ${guestCount} guests in ${incoming.city || fallback.city}`,
        `Allocated ₹${(budgetINR * 0.15).toLocaleString('en-IN')} as 15% safety contingency reserve`,
      ],
      missingFields,
      confidence: hasExactDate ? 95 : 85,
    };
  }

  /**
   * Deterministic simulated intake engine for offline / uncredited environments
   * Strictly adheres to Acceptance Tests A, C, D, and E
   */
  public generateSimulatedIntake(
    userInput: string,
    currentDraft: EventIntakeDraft,
    errorMessage?: string
  ): IntakeProcessResult {
    const text = userInput.toLowerCase();
    const isHindi = /[\u0900-\u097F]/.test(userInput) || /shadi|shaadi|janmadin|mehmaan|lakh|crore/i.test(userInput);

    // 1. Detect Event Type
    let eventType = currentDraft.eventType;
    let defaultTitle = currentDraft.title;
    if (/birthday|b'day|जनमदिन|जन्मदिन|cake|first year|1st/i.test(userInput)) {
      eventType = 'birthday';
      defaultTitle = 'Grand Birthday Celebration';
    } else if (/community|samaj|utsav|puja|fest|navratri|diwali|ganesh|सोसायटी|त्योहार/i.test(userInput)) {
      eventType = 'community';
      defaultTitle = 'Community Cultural Festival';
    } else if (/wedding|shaadi|shadi|marriage|विवाह|शादी|pheras|baraat/i.test(userInput)) {
      eventType = 'wedding';
      defaultTitle = 'Aarav & Meera’s Wedding';
    }

    // 2. Detect City
    let city = currentDraft.city;
    const cityMatches = [
      { name: 'Jaipur', regex: /jaipur|जयपुर/i },
      { name: 'Udaipur', regex: /udaipur|उदयपुर/i },
      { name: 'Mumbai', regex: /mumbai|बॉम्बे|मुंबई/i },
      { name: 'Delhi', regex: /delhi|दिल्ली|ncr/i },
      { name: 'Bengaluru', regex: /bangalore|bengaluru|बेंगलुरु/i },
      { name: 'Pune', regex: /pune|पुणे/i },
      { name: 'Ahmedabad', regex: /ahmedabad|अहमदाबाद/i },
      { name: 'Goa', regex: /goa|गोवा/i },
      { name: 'Kolkata', regex: /kolkata|calcutta|कोलकाता/i },
      { name: 'Lucknow', regex: /lucknow|लखनऊ/i },
    ];
    for (const c of cityMatches) {
      if (c.regex.test(userInput)) {
        city = c.name;
        break;
      }
    }

    // 3. Detect Guest Count
    let guestCount = currentDraft.guestCount;
    const guestMatch = userInput.match(/(\d{2,4})\s*(?:guests?|people|pax|mehmaan|kids|children|attendees|members|लोग|मेहमान|बच्चे)/i);
    if (guestMatch) {
      guestCount = parseInt(guestMatch[1], 10);
    } else {
      const hindiGuests = userInput.match(/(\d{2,4})\s*(?:लोगों|बच्चों)/);
      if (hindiGuests) guestCount = parseInt(hindiGuests[1], 10);
    }

    // 4. Detect Budget
    let budgetINR = currentDraft.budgetINR;
    const lakhMatch = userInput.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|l\b|लाख)/i);
    const croreMatch = userInput.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|cr\b|करोड़)/i);
    const rawNumberMatch = userInput.match(/(?:₹|rs\.?|inr)\s*(\d{5,9})/i);

    if (lakhMatch) {
      budgetINR = Math.round(parseFloat(lakhMatch[1]) * 100000);
    } else if (croreMatch) {
      budgetINR = Math.round(parseFloat(croreMatch[1]) * 10000000);
    } else if (rawNumberMatch) {
      budgetINR = parseInt(rawNumberMatch[1], 10);
    }

    // 5. Detect Food Preference
    let foodPreference = currentDraft.foodPreference;
    if (/pure veg|vegetarian|शाकाहारी|वेज|no non-veg/i.test(userInput)) {
      foodPreference = 'vegetarian';
    } else if (/jain|no onion|जैन|बिना प्याज/i.test(userInput)) {
      foodPreference = 'jain';
    } else if (/non-veg|chicken|mutton|मांसाहारी/i.test(userInput)) {
      foodPreference = 'non-veg';
    } else if (/mixed|both veg/i.test(userInput)) {
      foodPreference = 'mixed';
    }

    // 6. Detect Date / Uncertainty (Acceptance Test C)
    const isTentative =
      /not sure|tentative|date to be confirmed|tbd|decide later|अगले साल|तारीख तय नहीं|पक्की नहीं/i.test(userInput);

    let hasExactDate = currentDraft.hasExactDate;
    let eventDate = currentDraft.eventDate;
    let eventDateWindow = currentDraft.eventDateWindow || 'Date to be confirmed';

    if (isTentative) {
      hasExactDate = false;
      eventDate = null;
      eventDateWindow = 'Date to be confirmed';
    } else {
      // Check for calendar date e.g. 2026-11-20 or "20th Nov"
      const dateMatch = userInput.match(/\b(202[5-9]-[0-1][0-9]-[0-3][0-9])\b/);
      if (dateMatch) {
        hasExactDate = true;
        eventDate = dateMatch[1];
        eventDateWindow = eventDate;
      }
    }

    // Missing fields check
    const missingFields: string[] = [];
    if (!hasExactDate && !eventDate) missingFields.push('eventDate');

    const draft: EventIntakeDraft = {
      eventType,
      title: defaultTitle,
      city,
      state: city === 'Jaipur' || city === 'Udaipur' ? 'Rajasthan' : 'India',
      hasExactDate,
      eventDate: hasExactDate ? eventDate : null,
      eventDateWindow,
      guestCount,
      budgetINR,
      foodPreference,
      tier: currentDraft.tier,
      functionCount: eventType === 'wedding' ? 2 : 1,
      functions:
        eventType === 'wedding'
          ? ['Sangeet & Mehendi Night', 'Wedding Pheras & Reception Feast']
          : eventType === 'birthday'
          ? ['Theme Party & Cake Cutting']
          : ['Cultural Program & Community Feast'],
      venueType: currentDraft.venueType,
      accommodationNeeded: currentDraft.accommodationNeeded,
      traditions: [isHindi ? 'भारतीय परम्पराएँ' : 'North Indian / Regional Celebrations'],
      preferences: [
        foodPreference === 'vegetarian' ? 'Pure vegetarian catering' : `${foodPreference} catering`,
        `${guestCount} guests capacity`,
      ],
      assumptions: [
        `Extracted: ${guestCount} guests in ${city} with ₹${(budgetINR / 100000).toFixed(1)} Lakh budget`,
        `Catering baseline calculated with ${foodPreference} service`,
        `Safety reserve set at 15% (₹${Math.round(budgetINR * 0.15).toLocaleString('en-IN')})`,
      ],
      missingFields,
      confidence: hasExactDate ? 95 : 85,
    };

    // Construct response text (Bilingual)
    let replyText = '';
    let followUpQuestions: string[] = [];

    if (isHindi) {
      if (missingFields.includes('eventDate')) {
        replyText = `बहुत बढ़िया! मैंने आपकी जानकारी दर्ज कर ली है: **${city}** में **${guestCount} मेहमानों** के लिए **${eventType === 'wedding' ? 'शादी' : 'समारोह'}**, बजट **₹${(budgetINR / 100000).toFixed(1)} लाख** और **${foodPreference === 'vegetarian' ? 'शुद्ध शाकाहारी' : foodPreference}** खानपान।\n\nक्या आपके पास कोई निश्चित तारीख तय है, या हम इसे अभी **'तारीख तय होना बाकी' (Date to be confirmed)** रखें?`;
        followUpQuestions = [
          'तारीख अभी तय नहीं (Date to be confirmed)',
          'नवंबर 2026 के आसपास',
          '2 दिन का कार्यक्रम रखें',
          'हेरिटेज लॉन वेन्यू पसंद है',
        ];
      } else {
        replyText = `शानदार! आपकी रूपरेखा तैयार है: **${city}**, **${guestCount} मेहमान**, **₹${(budgetINR / 100000).toFixed(1)} लाख** बजट। आप नीचे दिए गए ड्राफ्ट को एडिट कर सकते हैं या 'सेव करें' पर क्लिक कर सकते हैं।`;
        followUpQuestions = ['वेन्यू के विकल्प दिखाएं', 'बजट का विभाजन देखें', 'ड्राफ्ट सेव करें'];
      }
    } else {
      if (missingFields.includes('eventDate')) {
        replyText = `Wonderful! I have drafted your **${city} ${eventType}** for **${guestCount} guests** with a **₹${(budgetINR / 100000).toFixed(1)} Lakh** budget and **${foodPreference}** catering.\n\nDo you have an exact calendar date in mind, or would you prefer to mark it as **"Date to be confirmed"** for now?`;
        followUpQuestions = [
          'Date to be confirmed (Keep tentative)',
          'Late Winter 2026',
          'Prefer outdoor heritage lawn',
          'Include Sangeet and Haldi functions',
        ];
      } else {
        replyText = `Excellent! Your **${city} celebration draft** is prepared with **${guestCount} guests**, **₹${(budgetINR / 100000).toFixed(1)}L budget**, and verified catering parameters. Review the details in the draft panel on the right.`;
        followUpQuestions = ['View suggested budget split', 'Review timeline milestones', 'Confirm and launch dashboard'];
      }
    }

    return {
      replyText: `${replyText}\n\n*(Demo simulation — Gemini integration comes later. ${errorMessage ? `Server notice: ${errorMessage}` : 'API key not configured on server.'})*`,
      draft,
      followUpQuestions,
      isComplete: true,
      simulated: true,
      notice: errorMessage || 'Demo simulation fallback active',
    };
  }
}

export const eventArchitectService = new EventArchitectIntakeService();
