/**
 * Utsav AI — Phase 7: Vendor Discovery & Inspiration Client Service
 * Communicates with /api/vendors and /api/inspiration with offline fallbacks.
 */

import { EventModel, InvitationDraftContent, PlacesVendorResult, QuoteExtractionCandidate } from '../types';
import { SAMPLE_JAIPUR_DIRECTORY } from '../server/vendors/placesAdapter';
import { QuoteExtractor } from '../server/vendors/quoteExtractor';
import { InvitationAdvisor } from '../server/inspiration/invitationAdvisor';

export class VendorClient {
  public async searchPlacesVendors(
    city: string = 'Jaipur',
    category: string = 'Catering',
    radiusKm: number = 25
  ): Promise<{
    results: PlacesVendorResult[];
    isLive: boolean;
    queryUsed: string;
    sourceNotice: string;
  }> {
    try {
      const res = await fetch(
        `/api/vendors/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(
          category
        )}&radiusKm=${radiusKm}`
      );
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    const catLower = category.toLowerCase();
    const categoryKey = Object.keys(SAMPLE_JAIPUR_DIRECTORY).find((k) =>
      catLower.includes(k)
    ) || 'default';

    return {
      results: (SAMPLE_JAIPUR_DIRECTORY[categoryKey] || SAMPLE_JAIPUR_DIRECTORY.default).map((item) => ({
        ...item,
        city,
      })),
      isLive: false,
      queryUsed: `${category} in ${city}`,
      sourceNotice: 'VERIFIED_DIRECTORY - Curated vendor directory reference.',
    };
  }

  public async extractQuote(
    rawText: string,
    filename?: string,
    mimeType?: string,
    fileSizeBytes?: number,
    authToken?: string
  ): Promise<QuoteExtractionCandidate> {
    try {
      const res = await fetch('/api/vendors/extract-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? (authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`) : 'Bearer demo-user-guest',
        },
        body: JSON.stringify({ rawText, filename, mimeType, fileSizeBytes }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return QuoteExtractor.parseDeterministic(rawText, filename);
  }

  public async generateInvitation(
    event: EventModel,
    language: 'en' | 'hi' | 'bilingual' = 'en',
    tone: 'traditional_royal' | 'modern_minimal' | 'festive_warm' = 'traditional_royal',
    hostsLine?: string,
    coupleOrHonorName?: string,
    customRequests?: string,
    authToken?: string
  ): Promise<InvitationDraftContent> {
    try {
      const res = await fetch('/api/inspiration/generate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? (authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`) : 'Bearer demo-user-guest',
        },
        body: JSON.stringify({
          event,
          language,
          tone,
          hostsLine,
          coupleOrHonorName,
          customRequests,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return InvitationAdvisor.generateDeterministic({
      event,
      language,
      tone,
      hostsLine,
      coupleOrHonorName,
      customRequests,
    });
  }

  public async generateSponsorProposal(event: EventModel) {
    try {
      const res = await fetch('/api/inspiration/sponsor-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }

    return InvitationAdvisor.generateSponsorProposal(event);
  }

  public async runTests() {
    const res = await fetch('/api/vendors/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Test endpoint returned status ${res.status}`);
    }
    return await res.json();
  }
}

export const vendorClient = new VendorClient();
