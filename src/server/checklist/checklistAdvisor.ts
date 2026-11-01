import { aiUsageGateway } from '../gateway/gateway';
import { ChecklistEngine, TaskExpansionCandidate } from '../../domain/checklistEngine';
import { TaskItem, TaskPriority } from '../../types';

export interface SuggestionResponse {
  category: string;
  suggestions: (TaskExpansionCandidate & { id: string })[];
  totalSuggested: number;
  duplicateCount: number;
  simulated: boolean;
  notes?: string;
}

export interface AuditIssue {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface AuditResponse {
  issues: AuditIssue[];
  totalIssues: number;
  hasCriticalGaps: boolean;
  disclaimer: string;
  simulated: boolean;
}

export class ChecklistAdvisorService {
  /**
   * Generates microtask expansions for an event category.
   * Routes through AI Usage Gateway and deduplicates against existing tasks.
   */
  async suggestTaskExpansion(
    eventContext: {
      name?: string;
      type?: string;
      city?: string;
      guestCount?: number;
      eventDate?: string;
    },
    categoryNameOrId: string,
    existingTasks: TaskItem[],
    authHeader?: string
  ): Promise<SuggestionResponse> {
    const category = categoryNameOrId.toLowerCase().trim();

    const systemPrompt = `You are an expert Indian Event Operations Architect for Utsav AI.
Your role is to propose high-yield, culturally authentic, and operationally rigorous microtasks for the given event and category.
Event details:
- Event: "${eventContext.name || 'Celebration'}" (${eventContext.type || 'wedding'})
- City: ${eventContext.city || 'India'}
- Guest Count: ${eventContext.guestCount || 200}
- Category: ${categoryNameOrId}

Return a STRICT JSON object in this format:
{
  "suggestions": [
    {
      "title": "Actionable task title",
      "subcategoryName": "Specific subcategory",
      "description": "Clear operational instructions",
      "priority": "high" | "medium" | "low",
      "relativeOffsetDays": -15,
      "estimatedCost": 5000,
      "rationale": "Why this task prevents last-minute stress"
    }
  ]
}
Return between 3 and 6 distinct microtasks that do not duplicate basic obvious milestones. Focus on logistics, fittings, trials, and backup plans.`;

    const userPrompt = `Propose granular operational microtasks for category "${categoryNameOrId}".`;

    let rawSuggestions: TaskExpansionCandidate[] = [];
    let simulated = false;

    try {
      const response = await aiUsageGateway.execute(
        {
          workflow: 'CHECKLIST_GENERATION',
          systemInstruction: systemPrompt,
          prompt: userPrompt,
          contextData: { category, eventType: eventContext.type || 'wedding' },
        },
        undefined,
        authHeader
      );

      if (response.success && response.text) {
        // Parse JSON from model text
        const text = response.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.suggestions)) {
            rawSuggestions = parsed.suggestions;
          }
        }
      } else {
        simulated = true;
      }
    } catch (err) {
      console.warn('[ChecklistAdvisor] Gateway execution failed, using curated simulation:', err);
      simulated = true;
    }

    // Curated cultural fallbacks if model output was empty or gateway was simulated
    if (rawSuggestions.length === 0) {
      simulated = true;
      rawSuggestions = this.getCuratedFallbackSuggestions(category, eventContext.type || 'wedding');
    }

    // Run deduplication against existing tasks using domain engine
    const deduplicated = ChecklistEngine.deduplicateCandidates(rawSuggestions, existingTasks);

    const suggestionsWithIds = deduplicated.map((s, idx) => ({
      ...s,
      id: `sugg-${category}-${Date.now()}-${idx + 1}`,
    }));

    const duplicateCount = suggestionsWithIds.filter((s) => s.isDuplicate).length;

    return {
      category: categoryNameOrId,
      suggestions: suggestionsWithIds,
      totalSuggested: suggestionsWithIds.length,
      duplicateCount,
      simulated,
      notes: simulated
        ? 'Generated from Utsav AI Cultural Operations Knowledge Base (Simulated preview).'
        : 'Generated live via Gemini AI Usage Gateway.',
    };
  }

  /**
   * Audits existing checklist tasks against critical operational blindspots.
   */
  async auditChecklist(
    eventContext: {
      name?: string;
      type?: string;
      city?: string;
      guestCount?: number;
      eventDate?: string;
    },
    tasks: TaskItem[],
    authHeader?: string
  ): Promise<AuditResponse> {
    const issues: AuditIssue[] = [];
    const eventType = (eventContext.type || 'wedding').toLowerCase();
    const guestCount = eventContext.guestCount || 200;

    const taskTitles = tasks.map((t) => t.title.toLowerCase());
    const hasMatch = (keywords: string[]) =>
      taskTitles.some((title) => keywords.some((k) => title.includes(k)));

    // 1. Municipal NOC & Police Clearance (Critical for large gatherings)
    if (!hasMatch(['police', 'noc', 'permit', 'permission', 'clearance'])) {
      issues.push({
        id: 'gap-police-noc',
        category: 'Permissions & Legal',
        severity: guestCount > 150 ? 'critical' : 'warning',
        title: 'Missing Police Station NOC & Sound Clearance',
        description: `Your celebration anticipates ${guestCount} guests, but lacks a formal NOC or music permission task.`,
        recommendation: 'File a formal sound clearance application with the local police jurisdiction at least 15 days before the event.',
      });
    }

    // 2. Backup Silent Generator
    if (!hasMatch(['generator', 'dg set', 'power backup', 'diesel'])) {
      issues.push({
        id: 'gap-generator',
        category: 'Power & Infrastructure',
        severity: 'critical',
        title: 'No Standby Silent Generator Task',
        description: 'Mandap floodlights, high-draw halogen rigs, and PA audio systems require dual redundant power.',
        recommendation: 'Contract a 25kVA silent DG generator with 4 hours of reserve diesel fuel.',
      });
    }

    // 3. Elderly Assistance & Mobility
    if (guestCount >= 100 && !hasMatch(['elder', 'wheelchair', 'golf cart', 'mobility', 'senior'])) {
      issues.push({
        id: 'gap-elder-care',
        category: 'Guest Hospitality',
        severity: 'warning',
        title: 'Elder Guest Transit & Accessibility Gap',
        description: 'Large heritage venues often require extensive walking between the parking lawn and dinner courtyard.',
        recommendation: 'Arrange 2 transport wheelchairs or an electric golf cart at the welcome porch for seniors.',
      });
    }

    // 4. First Aid & Emergency Contact
    if (!hasMatch(['first aid', 'medical', 'paramedic', 'doctor', 'emergency kit'])) {
      issues.push({
        id: 'gap-first-aid',
        category: 'Safety',
        severity: 'info',
        title: 'Emergency Medical & Hydration Station',
        description: 'Outdoor daytime ceremonies require emergency first aid, burn cream, ORS electrolyte sachets, and an on-call physician contact.',
        recommendation: 'Designate a family volunteer with a first-aid kit and local hospital helpline.',
      });
    }

    // 5. Groom Outfit Alteration Trial (For Weddings)
    if (eventType === 'wedding') {
      const groomTasks = tasks.filter((t) => t.categoryId.toLowerCase() === 'groom');
      const hasTrial = groomTasks.some((t) => t.title.toLowerCase().includes('trial') || t.title.toLowerCase().includes('fitting'));
      if (!hasTrial) {
        issues.push({
          id: 'gap-groom-trial',
          category: 'Groom',
          severity: 'warning',
          title: 'Missing Intermediate Sherwani Trial Fitting',
          description: 'A bespoke sherwani must be tested while sitting cross-legged for a 2-hour mandap ceremony.',
          recommendation: 'Schedule a trial fitting 20 to 25 days before the ceremony before final embroidery locking.',
        });
      }
    }

    return {
      issues,
      totalIssues: issues.length,
      hasCriticalGaps: issues.some((i) => i.severity === 'critical'),
      disclaimer:
        'Context-dependent and non-exhaustive. Always verify with local municipal authorities, fire safety departments, and venue management.',
      simulated: false,
    };
  }

  private getCuratedFallbackSuggestions(category: string, eventType: string): TaskExpansionCandidate[] {
    if (category.includes('groom')) {
      return [
        {
          title: 'Bespoke Safa Tying Master Artist Booking',
          subcategoryName: 'Attire & Styling',
          description: 'Contract experienced safa tying artist to style royal Jodhpuri pagri for groom and 15 family elders on wedding morning.',
          priority: 'high',
          relativeOffsetDays: -15,
          estimatedCost: 8000,
          rationale: 'Prevents morning chaos and ensures uniform regal styling across groom procession elders.',
        },
        {
          title: 'Groom Mandap Comfort & Seating Posture Check',
          subcategoryName: 'Attire & Styling',
          description: 'Test sherwani churidar flexibility while sitting cross-legged for 2 hours on a mandap low chowki.',
          priority: 'medium',
          relativeOffsetDays: -12,
          rationale: 'Avoids circulation cutoff or tight knee seam tearing during prolonged sacred Vedic vows.',
        },
        {
          title: 'Emergency Groom Wardrobe Repair Kit Preparation',
          subcategoryName: 'Attire & Styling',
          description: 'Assemble fabric safety pins, matching gold thread, spare sherwani buttons, and lint roller in groom suite.',
          priority: 'low',
          relativeOffsetDays: -3,
          estimatedCost: 1000,
          rationale: 'Saves critical minutes in case of brooch snagging or button detachment right before the Baraat.',
        },
        {
          title: 'Baraat Entry Song Playlist & Dhol Cue Sheet',
          subcategoryName: 'Baraat Logistics',
          description: 'Coordinate 3 high-energy songs with mobile DJ truck and dhol drummers for the 800m arrival gate.',
          priority: 'medium',
          relativeOffsetDays: -7,
          rationale: 'Ensures seamless musical tempo matching the groom vintage car pace.',
        },
      ];
    }

    if (category.includes('invitation')) {
      return [
        {
          title: 'Interactive WhatsApp RSVP Follow-Up Broadcast',
          subcategoryName: 'RSVP Tracking',
          description: 'Send personalized digital RSVP reminder links with map location pin to unconfirmed guests.',
          priority: 'high',
          relativeOffsetDays: -18,
          rationale: 'Critical for locking catering head guarantees and avoiding empty reserved plates.',
        },
        {
          title: 'Luggage Tag & Hotel Itinerary Envelope Inserts',
          subcategoryName: 'Guest Coordination',
          description: 'Include hotel check-in cards and welcome baggage tags inside boxed invitation packages.',
          priority: 'medium',
          relativeOffsetDays: -35,
          estimatedCost: 3500,
          rationale: 'Accelerates hotel room check-in and prevents baggage misplacement upon airport arrival.',
        },
      ];
    }

    // General fallback
    return [
      {
        title: `Verify ${category} vendor contract SLA & arrival window`,
        subcategoryName: 'Contract Compliance',
        description: `Confirm explicit load-in time, sound decibel terms, and balance payment milestone for ${category}.`,
        priority: 'high',
        relativeOffsetDays: -14,
        rationale: 'Locks in vendor operational accountability before the final week.',
      },
      {
        title: `Designate family point-of-contact for ${category}`,
        subcategoryName: 'Operations',
        description: 'Appoint one responsible team member to oversee vendor arrival and approve setup sign-off.',
        priority: 'medium',
        relativeOffsetDays: -7,
        rationale: 'Prevents vendors from calling the couple or parents during ceremonies.',
      },
    ];
  }
}

export const checklistAdvisorService = new ChecklistAdvisorService();
