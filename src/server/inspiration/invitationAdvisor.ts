/**
 * Utsav AI — Phase 7: Gemini Invitation & Theme Advisor
 * Generates culturally authentic invitation drafts, sponsor proposals, and concept moodboards
 * with strict date uncertainty handling and labeled concept art.
 */

import { EventModel, InvitationDraftContent } from '../../types';
import { aiUsageGateway } from '../gateway/gateway';

export interface GenerateInvitationParams {
  event: EventModel;
  language: 'en' | 'hi' | 'bilingual';
  tone: 'traditional_royal' | 'modern_minimal' | 'festive_warm';
  hostsLine?: string;
  coupleOrHonorName?: string;
  customRequests?: string;
  userId?: string;
  authHeader?: string;
}

export class InvitationAdvisor {
  /**
   * Deterministic template generator (safe fallback)
   */
  public static generateDeterministic(params: GenerateInvitationParams): InvitationDraftContent {
    const { event, language, tone, hostsLine, coupleOrHonorName } = params;

    const isDateConfirmed = Boolean(event.hasExactDate && event.eventDate);
    const dateLine = isDateConfirmed
      ? `Auspicious Date: ${event.eventDate} · Evening Muhurat`
      : 'Date & Auspicious Muhurat to be announced shortly with family blessings';

    const hosts = hostsLine || 'Smt. Sunita & Shri Rajesh Sharma';
    const couple = coupleOrHonorName || (event.type === 'wedding' ? 'Aarav & Meera' : event.name);
    const venue = event.venueType
      ? `${event.venueType}, ${event.city}, Rajasthan`
      : `Heritage Banquet Lawns, ${event.city}, Rajasthan`;

    if (language === 'hi') {
      return {
        title: 'पारंपरिक राजस्थानी विवाह आमंत्रण',
        language: 'hi',
        shlokaOrBlessing: '॥ श्री गणेशाय नमः ॥ वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
        hostsLine: hosts,
        invitationText: 'स्नेहपूर्वक आपको और आपके सपरिवार को हमारे प्रिय सुपुत्र के शुभ विवाह समारोह में सादर आमंत्रित करते हैं।',
        coupleOrHonorLine: couple,
        dateAndMuhuratLine: dateLine,
        venueLine: venue,
        rsvpLine: 'दर्शनाभिलाषी: समस्त शर्मा परिवार एवं मित्रगण',
        isDateConfirmed,
        notes: isDateConfirmed ? 'Confirmed auspicious date' : 'Date tentative: awaiting family astrological mahurat confirmation.',
      };
    }

    if (language === 'bilingual') {
      return {
        title: 'Bilingual Royal Rajasthani Vivah Patrika',
        language: 'bilingual',
        shlokaOrBlessing: '॥ ॐ श्री गणेशाय नमः ॥ Seeking divine blessings of the Almighty',
        hostsLine: `${hosts} cordially request the pleasure of your gracious presence`,
        invitationText: 'to celebrate the auspicious wedding ceremony and union of',
        coupleOrHonorLine: couple,
        dateAndMuhuratLine: dateLine,
        venueLine: venue,
        rsvpLine: 'With best compliments from Sharma Family & Relatives',
        isDateConfirmed,
        notes: isDateConfirmed ? 'Confirmed auspicious date' : 'Date tentative: awaiting family astrological mahurat confirmation.',
      };
    }

    // Default English
    return {
      title: 'Traditional Royal Celebration Invitation',
      language: 'en',
      shlokaOrBlessing: 'With the divine blessings of our ancestors and elders',
      hostsLine: hosts,
      invitationText: 'request the honor of your presence and warm blessings to celebrate the wedding ceremony of',
      coupleOrHonorLine: couple,
      dateAndMuhuratLine: dateLine,
      venueLine: venue,
      rsvpLine: 'RSVP: Sharma Family · +91 98290 12345',
      isDateConfirmed,
      notes: isDateConfirmed ? 'Confirmed date' : 'Date tentative: awaiting family astrological mahurat confirmation.',
    };
  }

  /**
   * Generates sponsor proposal for community events
   */
  public static generateSponsorProposal(event: EventModel) {
    return {
      title: `Community Partnership & Sponsorship Proposal: ${event.name}`,
      eventSummary: {
        name: event.name,
        city: event.city,
        estimatedAttendees: event.guestCount || 500,
        targetBudget: event.totalBudget,
      },
      proposedTiers: [
        {
          tierName: 'Title Partner (PROPOSED - Not Contractually Confirmed)',
          contributionINR: Math.round(event.totalBudget * 0.4),
          entitlements: [
            'Main stage banner branding & primary promotional logo placement',
            'Welcome address speaking slot (5 minutes)',
            'Dedicated community kiosk in VIP hospitality zone',
          ],
          disclaimer: 'Proposed partner tier subject to committee sign-off and formal MoU.',
        },
        {
          tierName: 'Associate Partner (PROPOSED - Not Contractually Confirmed)',
          contributionINR: Math.round(event.totalBudget * 0.2),
          entitlements: [
            'Side-wing stage banners and printed program guide logo',
            'Social media shoutout on community group bulletin',
          ],
          disclaimer: 'Proposed partner tier subject to committee sign-off and formal MoU.',
        },
      ],
      notice:
        'COMMUNITY PROPOSAL DRAFT: All prospective sponsors and entitlements are illustrative proposals, not legally confirmed partnerships.',
    };
  }

  /**
   * Generates invitation draft using Gemini via AI Usage Gateway
   */
  public static async generateInvitation(
    params: GenerateInvitationParams
  ): Promise<InvitationDraftContent> {
    const { event, language, tone, hostsLine, coupleOrHonorName, customRequests, userId, authHeader } = params;

    const isDateConfirmed = Boolean(event.hasExactDate && event.eventDate);
    const dateRule = isDateConfirmed
      ? `Event Date is confirmed: ${event.eventDate}. Output this exact date.`
      : `Event Date is UNCONFIRMED or TENTATIVE. DO NOT invent or fabricate a date. State that the date and auspicious muhurat will be confirmed shortly.`;

    try {
      const prompt = `You are an expert Indian celebration invitation writer and calligraphy curator.
Create an authentic, elegant celebration invitation copy based on this event context:

Event Name: ${event.name}
Event Type: ${event.type}
City: ${event.city}, Rajasthan
Target Language: ${language} (en = English, hi = Hindi Devanagari, bilingual = English with Sanskrit shloka)
Tone: ${tone}
Hosts: ${hostsLine || 'Family Hosts'}
Celebrants/Honorees: ${coupleOrHonorName || 'Couple'}
${dateRule}
Special Requests: ${customRequests || 'None'}

Return ONLY valid JSON adhering to:
{
  "title": "Title of invitation style",
  "language": "${language}",
  "shlokaOrBlessing": "Sacred Sanskrit shloka or opening blessing",
  "hostsLine": "Hosts name and honorifics",
  "invitationText": "Warm invitation solicitation phrasing",
  "coupleOrHonorLine": "Name of couple or celebrants",
  "dateAndMuhuratLine": "Auspicious date and muhurat timing",
  "venueLine": "Venue line in ${event.city}",
  "rsvpLine": "RSVP contact line",
  "isDateConfirmed": ${isDateConfirmed},
  "notes": "Cultural notes"
}`;

      const res = await aiUsageGateway.execute(
        {
          workflow: 'INVITATION_WORDING',
          prompt,
        },
        { userId: userId || 'demo-user-guest', isDemoUser: false },
        authHeader
      );

      if (res.success && res.text) {
        const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.invitationText) {
          return {
            title: parsed.title || 'Personalized Invitation Draft',
            language,
            shlokaOrBlessing: parsed.shlokaOrBlessing,
            hostsLine: parsed.hostsLine || hostsLine || 'Family Hosts',
            invitationText: parsed.invitationText,
            coupleOrHonorLine: parsed.coupleOrHonorLine || coupleOrHonorName || event.name,
            dateAndMuhuratLine: parsed.dateAndMuhuratLine || (isDateConfirmed ? event.eventDate! : 'Date to be confirmed'),
            venueLine: parsed.venueLine || `${event.city}, Rajasthan`,
            rsvpLine: parsed.rsvpLine || 'RSVP: Family & Friends',
            isDateConfirmed,
            notes: parsed.notes || 'Generated via AI Usage Gateway',
          };
        }
      }
    } catch (err) {
      console.warn('[InvitationAdvisor] AI generation fallback:', err);
    }

    return InvitationAdvisor.generateDeterministic(params);
  }
}
