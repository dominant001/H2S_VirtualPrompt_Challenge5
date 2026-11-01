/**
 * Utsav AI — Phase 7: Google Maps Platform Places Adapter
 * Provides vendor location discovery with server-side proxy, field masks,
 * and graceful fallback to clearly labeled demo cards.
 */

import { PlacesVendorResult } from '../../types';

export const SAMPLE_JAIPUR_DIRECTORY: Record<string, PlacesVendorResult[]> = {
  catering: [
    {
      id: 'demo-place-cat-1',
      name: 'Royal Rajputana Caterers & Live Stations',
      category: 'Catering',
      address: 'Plot 42, Amer Road Heritage Precinct, Jaipur, Rajasthan 302002',
      city: 'Jaipur',
      rating: 4.7,
      userRatingCount: 312,
      websiteUri: 'https://example.com/royal-rajputana-caterers',
      phone: '+91 141 263 8891',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Plate rates, minimum guarantees, and availability must be verified directly with the caterer.',
    },
    {
      id: 'demo-place-cat-2',
      name: 'Gaurav Sweets & Marwari Banquet Catering',
      category: 'Catering',
      address: '15 Johari Bazaar Main Market, Pink City, Jaipur, Rajasthan 302003',
      city: 'Jaipur',
      rating: 4.5,
      userRatingCount: 520,
      websiteUri: 'https://example.com/gaurav-catering',
      phone: '+91 141 256 1234',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Plate rates, minimum guarantees, and availability must be verified directly with the caterer.',
    },
    {
      id: 'demo-place-cat-3',
      name: 'Satvik Gourmet Hospitality & Thali Experience',
      category: 'Catering',
      address: '8 Tonk Road, Bapu Nagar, Jaipur, Rajasthan 302015',
      city: 'Jaipur',
      rating: 4.6,
      userRatingCount: 184,
      websiteUri: 'https://example.com/satvik-gourmet',
      phone: '+91 141 270 9942',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Plate rates, minimum guarantees, and availability must be verified directly with the caterer.',
    },
  ],
  venue: [
    {
      id: 'demo-place-ven-1',
      name: 'Heritage Haveli Resort & Royal Lawns',
      category: 'Venue',
      address: 'Delhi-Jaipur Highway KM 24, Kukas, Jaipur, Rajasthan 302028',
      city: 'Jaipur',
      rating: 4.8,
      userRatingCount: 640,
      websiteUri: 'https://example.com/heritage-haveli-jaipur',
      phone: '+91 141 282 4500',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Venue rental, license caps, and dates must be confirmed directly with banquet management.',
    },
    {
      id: 'demo-place-ven-2',
      name: 'Jaipur Palace Courtyard & Banquet Gardens',
      category: 'Venue',
      address: 'Near Jal Mahal, Amer Road, Jaipur, Rajasthan 302002',
      city: 'Jaipur',
      rating: 4.6,
      userRatingCount: 410,
      websiteUri: 'https://example.com/jaipur-palace-courtyard',
      phone: '+91 141 263 7100',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Venue rental, license caps, and dates must be confirmed directly with banquet management.',
    },
  ],
  decor: [
    {
      id: 'demo-place-dec-1',
      name: 'Gulab Floral Artisans & Mandap Architecture',
      category: 'Decor',
      address: 'Shop 12, Tripolia Bazaar, Jaipur, Rajasthan 302002',
      city: 'Jaipur',
      rating: 4.6,
      userRatingCount: 220,
      websiteUri: 'https://example.com/gulab-decor-jaipur',
      phone: '+91 141 231 6678',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Stage designs, floral fabrication, and lighting packages must be quoted individually.',
    },
    {
      id: 'demo-place-dec-2',
      name: 'Pink City Royal Scenography & Light Design',
      category: 'Decor',
      address: '22 Godam Industrial Area, Jaipur, Rajasthan 302006',
      city: 'Jaipur',
      rating: 4.5,
      userRatingCount: 175,
      websiteUri: 'https://example.com/royal-scenography',
      phone: '+91 141 221 4455',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Stage designs, floral fabrication, and lighting packages must be quoted individually.',
    },
  ],
  photography: [
    {
      id: 'demo-place-photo-1',
      name: 'Jaipur Heritage Lens Studio & Cinematography',
      category: 'Photography',
      address: 'C-Scheme, Ashok Nagar, Jaipur, Rajasthan 302001',
      city: 'Jaipur',
      rating: 4.9,
      userRatingCount: 388,
      websiteUri: 'https://example.com/jaipur-heritage-lens',
      phone: '+91 141 237 8820',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Day rates, drone permissions, and deliverables must be agreed via written contract.',
    },
  ],
  default: [
    {
      id: 'demo-place-def-1',
      name: 'Jaipur Royal Event Logistics & Shuttles',
      category: 'Logistics',
      address: 'Sindhi Camp Transport Hub, Jaipur, Rajasthan 302001',
      city: 'Jaipur',
      rating: 4.4,
      userRatingCount: 150,
      websiteUri: 'https://example.com/jaipur-event-logistics',
      phone: '+91 141 220 3311',
      isLivePlaces: false,
      sourceLabel: 'DEMO_PLACES_RESULT - Curated directory, not a live Places API query',
      priceClarificationNotice: 'Places data shows business location & contact info. Vehicle count and driver timing must be booked directly with transport coordinator.',
    },
  ],
};

interface RawPlaceItem {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

export class PlacesAdapter {
  /**
   * Discovers vendors by city, category, and radius.
   * Connects to Google Places API (New Text Search) when key is configured.
   * Falls back gracefully to curated demo cards when key is absent or ineligible.
   */
  public static async searchVendors(
    city: string = 'Jaipur',
    category: string = 'catering',
    radiusKm: number = 25,
    apiKeyOverride?: string
  ): Promise<{
    results: PlacesVendorResult[];
    isLive: boolean;
    queryUsed: string;
    sourceNotice: string;
  }> {
    const apiKey =
      apiKeyOverride !== undefined
        ? apiKeyOverride
        : process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    const catLower = category.toLowerCase().trim();
    const query = `${category} in ${city}, India`;

    if (apiKey && apiKey.trim() !== '') {
      try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1',
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.internationalPhoneNumber',
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: 'en',
            maxResultCount: 8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.places && Array.isArray(data.places) && data.places.length > 0) {
            const placesResults: PlacesVendorResult[] = data.places.map((p: RawPlaceItem) => ({
              id: p.id || `live-place-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: p.displayName?.text || 'Vendor Business',
              category,
              address: p.formattedAddress || `${city}, Rajasthan, India`,
              city,
              rating: typeof p.rating === 'number' ? p.rating : undefined,
              userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
              websiteUri: p.websiteUri,
              phone: p.internationalPhoneNumber,
              isLivePlaces: true,
              sourceLabel: 'GOOGLE_PLACES_LIVE - Real-time Google Maps Places API result',
              priceClarificationNotice:
                'Places data provides location & public contact info. Catering rates, package pricing, and booking availability must be confirmed directly with the vendor.',
            }));

            return {
              results: placesResults,
              isLive: true,
              queryUsed: query,
              sourceNotice: 'Live Google Places API search results via server-side Places adapter.',
            };
          }
        }
      } catch (err) {
        console.warn('[PlacesAdapter] Google Places query error, falling back to demo directory:', err);
      }
    }

    // Graceful Fallback: Curated directory with explicit DEMO labels
    const categoryKey = Object.keys(SAMPLE_JAIPUR_DIRECTORY).find((k) =>
      catLower.includes(k)
    ) || 'default';

    const fallbackResults = (SAMPLE_JAIPUR_DIRECTORY[categoryKey] || SAMPLE_JAIPUR_DIRECTORY.default).map((item) => ({
      ...item,
      city: city || 'Jaipur',
    }));

    return {
      results: fallbackResults,
      isLive: false,
      queryUsed: query,
      sourceNotice:
        'DEMO_PLACES_DIRECTORY - Displaying curated illustrative vendors. No Google Maps API key was configured; zero fabricated rates.',
    };
  }
}
