import { BudgetCategory, EventModel, TaskItem } from '../types';
import { buildTasksFromPack, getTaskPackForEventType } from './taskTemplates';

export function createEventFromTemplate(data: {
  name: string;
  type: 'wedding' | 'birthday' | 'community';
  city: string;
  guestCount: number;
  totalBudget: number;
  foodPreference: 'vegetarian' | 'non-veg' | 'jain' | 'mixed';
  tier: 'budget' | 'standard' | 'premium';
  eventDate?: string;
  venueType: string;
  functionCount: number;
  accommodationNeeded?: boolean;
}): { event: EventModel; categories: BudgetCategory[]; tasks: TaskItem[] } {
  const eventId = `event-${Date.now()}`;
  const { name, type, city, guestCount, totalBudget, foodPreference, tier, eventDate, venueType, functionCount } = data;

  const event: EventModel = {
    id: eventId,
    name,
    type,
    city,
    state: 'India',
    ...(eventDate && eventDate.trim() !== '' ? { eventDate } : {}),
    guestCount,
    currency: 'INR',
    totalBudget,
    tier,
    foodPreference,
    functionCount,
    venueType,
    accommodationNeeded: false,
    traditions: type === 'wedding' ? ['Traditional'] : type === 'birthday' ? ['Cake Cutting', 'Party Games'] : ['Community Assembly'],
    keyPriorities: ['Smooth Guest Hospitality', 'Budget Discipline'],
    version: 1,
    cateringModel: {
      chargeablePlates: guestCount,
      sampleRatePerPlate: Math.round((totalBudget * 0.25) / Math.max(1, guestCount)),
      sampleExtras: Math.round(totalBudget * 0.03),
    },
  };

  let categories: BudgetCategory[] = [];

  if (type === 'birthday') {
    // Birthday category distribution totaling 100% of budget
    const venue = Math.round(totalBudget * 0.25);
    const catering = Math.round(totalBudget * 0.30);
    const entertainment = Math.round(totalBudget * 0.15);
    const cakeTheme = Math.round(totalBudget * 0.10);
    const favorsPhoto = Math.round(totalBudget * 0.10);
    const contingency = totalBudget - (venue + catering + entertainment + cakeTheme + favorsPhoto);

    categories = [
      {
        id: `cat-${eventId}-venue`,
        eventId,
        name: 'Venue & Play Area',
        allocated: venue,
        estimatedLow: Math.round(venue * 0.9),
        estimatedBase: venue,
        estimatedHigh: Math.round(venue * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Private party hall', 'Play zone access for kids'],
        exclusions: ['Arcade tokens', 'Damage deposit'],
        color: '#3B82F6',
        icon: 'Building2',
      },
      {
        id: `cat-${eventId}-catering`,
        eventId,
        name: 'Catering & Beverages',
        allocated: catering,
        estimatedLow: Math.round(catering * 0.9),
        estimatedBase: catering,
        estimatedHigh: Math.round(catering * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Kids friendly snacks', 'Main buffet meal', 'Juices & soft drinks'],
        exclusions: ['Imported chocolates'],
        color: '#E06D28',
        icon: 'Utensils',
      },
      {
        id: `cat-${eventId}-cake`,
        eventId,
        name: 'Designer Cake & Theme Decor',
        allocated: cakeTheme,
        estimatedLow: Math.round(cakeTheme * 0.9),
        estimatedBase: cakeTheme,
        estimatedHigh: Math.round(cakeTheme * 1.15),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Custom 3-tier theme fondant cake', 'Balloon arch & photo backdrop'],
        exclusions: ['Special pyro sparklers'],
        color: '#EC4899',
        icon: 'Cake',
      },
      {
        id: `cat-${eventId}-games`,
        eventId,
        name: 'Games & Entertainment',
        allocated: entertainment,
        estimatedLow: Math.round(entertainment * 0.85),
        estimatedBase: entertainment,
        estimatedHigh: Math.round(entertainment * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Professional Emcee / Game Host for 2 hours', 'Magic show & balloon twisting artist'],
        exclusions: ['Mascot costume rental'],
        color: '#8B5CF6',
        icon: 'Gamepad2',
      },
      {
        id: `cat-${eventId}-favors`,
        eventId,
        name: 'Return Gifts & Photography',
        allocated: favorsPhoto,
        estimatedLow: Math.round(favorsPhoto * 0.9),
        estimatedBase: favorsPhoto,
        estimatedHigh: Math.round(favorsPhoto * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Personalized return gift hampers for all child attendees', 'Event coverage photographer'],
        exclusions: ['Instant photo booth printouts'],
        color: '#10B981',
        icon: 'Gift',
      },
      {
        id: `cat-${eventId}-contingency`,
        eventId,
        name: 'Contingency Reserve',
        allocated: contingency,
        estimatedLow: contingency,
        estimatedBase: contingency,
        estimatedHigh: contingency,
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Extra unexpected guest heads', 'Emergency decor repairs'],
        exclusions: ['None'],
        isContingency: true,
        color: '#64748B',
        icon: 'ShieldAlert',
      },
    ];
  } else if (type === 'community') {
    // Community event
    const venuePermits = Math.round(totalBudget * 0.20);
    const stageAV = Math.round(totalBudget * 0.25);
    const foodWater = Math.round(totalBudget * 0.25);
    const safetySanitation = Math.round(totalBudget * 0.15);
    const contingency = totalBudget - (venuePermits + stageAV + foodWater + safetySanitation);

    categories = [
      {
        id: `cat-${eventId}-venue-permits`,
        eventId,
        name: 'Venue & Municipal Permissions',
        allocated: venuePermits,
        estimatedLow: Math.round(venuePermits * 0.9),
        estimatedBase: venuePermits,
        estimatedHigh: Math.round(venuePermits * 1.15),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Public ground reservation fees', 'Police & fire safety NOC permits', 'Local civic body clearance'],
        exclusions: ['Commercial branding billboard surcharges'],
        color: '#3B82F6',
        icon: 'Building2',
      },
      {
        id: `cat-${eventId}-stage-av`,
        eventId,
        name: 'Stage, Truss & AV Setup',
        allocated: stageAV,
        estimatedLow: Math.round(stageAV * 0.9),
        estimatedBase: stageAV,
        estimatedHigh: Math.round(stageAV * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Riser stage with backdrop', 'Line-array PA system with 6 mics', 'LED screen wall for community presentations'],
        exclusions: ['Pyrotechnics'],
        color: '#8B5CF6',
        icon: 'Music',
      },
      {
        id: `cat-${eventId}-food`,
        eventId,
        name: 'Community Refreshments & Water',
        allocated: foodWater,
        estimatedLow: Math.round(foodWater * 0.9),
        estimatedBase: foodWater,
        estimatedHigh: Math.round(foodWater * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Packaged clean drinking water dispensers', 'Snack packet distribution for attendees'],
        exclusions: ['Full sit-down lunch'],
        color: '#E06D28',
        icon: 'Utensils',
      },
      {
        id: `cat-${eventId}-safety`,
        eventId,
        name: 'Crowd Safety, First Aid & Cleanup',
        allocated: safetySanitation,
        estimatedLow: Math.round(safetySanitation * 0.9),
        estimatedBase: safetySanitation,
        estimatedHigh: Math.round(safetySanitation * 1.1),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Emergency first-aid medical desk + paramedic', 'Barricading & queue managers', 'Post-event sanitation & waste disposal crew'],
        exclusions: ['Dedicated ambulance hire standby'],
        color: '#10B981',
        icon: 'ShieldCheck',
      },
      {
        id: `cat-${eventId}-contingency`,
        eventId,
        name: 'Contingency Reserve',
        allocated: contingency,
        estimatedLow: contingency,
        estimatedBase: contingency,
        estimatedHigh: contingency,
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Weather tenting buffer', 'Generator diesel top-up'],
        exclusions: ['None'],
        isContingency: true,
        color: '#64748B',
        icon: 'ShieldAlert',
      },
    ];
  } else {
    // Default wedding fallback
    categories = [
      {
        id: `cat-${eventId}-venue`,
        eventId,
        name: 'Venue',
        allocated: Math.round(totalBudget * 0.25),
        estimatedLow: Math.round(totalBudget * 0.23),
        estimatedBase: Math.round(totalBudget * 0.25),
        estimatedHigh: Math.round(totalBudget * 0.28),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Lawn & Hall rental'],
        exclusions: ['Electricity backup surcharge'],
        color: '#3B82F6',
        icon: 'Building2',
      },
      {
        id: `cat-${eventId}-catering`,
        eventId,
        name: 'Catering',
        allocated: Math.round(totalBudget * 0.25),
        estimatedLow: Math.round(totalBudget * 0.24),
        estimatedBase: Math.round(totalBudget * 0.25),
        estimatedHigh: Math.round(totalBudget * 0.28),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Menu buffet', 'Service staff'],
        exclusions: ['Specialty imported desserts'],
        color: '#E06D28',
        icon: 'Utensils',
      },
      {
        id: `cat-${eventId}-outfits`,
        eventId,
        name: 'Outfits & Grooming',
        allocated: Math.round(totalBudget * 0.10),
        estimatedLow: Math.round(totalBudget * 0.09),
        estimatedBase: Math.round(totalBudget * 0.10),
        estimatedHigh: Math.round(totalBudget * 0.12),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Groom sherwani & safa', 'Bridal ensemble', 'Hair & makeup'],
        exclusions: ['Jewelry purchases'],
        color: '#F59E0B',
        icon: 'Shirt',
      },
      {
        id: `cat-${eventId}-decor`,
        eventId,
        name: 'Decor',
        allocated: Math.round(totalBudget * 0.15),
        estimatedLow: Math.round(totalBudget * 0.13),
        estimatedBase: Math.round(totalBudget * 0.15),
        estimatedHigh: Math.round(totalBudget * 0.18),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'medium',
        inclusions: ['Mandap & Stage floral setup'],
        exclusions: ['Exotic imported blooms'],
        color: '#EC4899',
        icon: 'Sparkles',
      },
      {
        id: `cat-${eventId}-invitations`,
        eventId,
        name: 'Invitations',
        allocated: Math.round(totalBudget * 0.05),
        estimatedLow: Math.round(totalBudget * 0.04),
        estimatedBase: Math.round(totalBudget * 0.05),
        estimatedHigh: Math.round(totalBudget * 0.06),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Physical boxed cards', 'Digital WhatsApp invites'],
        exclusions: ['Custom wax seals'],
        color: '#10B981',
        icon: 'Mail',
      },
      {
        id: `cat-${eventId}-contingency`,
        eventId,
        name: 'Contingency Reserve',
        allocated: totalBudget - Math.round(totalBudget * 0.80),
        estimatedLow: totalBudget - Math.round(totalBudget * 0.80),
        estimatedBase: totalBudget - Math.round(totalBudget * 0.80),
        estimatedHigh: totalBudget - Math.round(totalBudget * 0.80),
        committed: 0,
        paid: 0,
        sourceType: 'modelled',
        confidence: 'high',
        inclusions: ['Emergency buffer'],
        exclusions: ['None'],
        isContingency: true,
        color: '#64748B',
        icon: 'ShieldAlert',
      },
    ];
  }

  // Load type-specific template pack
  const pack = getTaskPackForEventType(type);
  const tasks = buildTasksFromPack(pack, eventId);

  return { event, categories, tasks };
}
