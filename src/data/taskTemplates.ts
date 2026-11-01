import { TaskItem, TaskPriority } from '../types';

export interface TemplateTaskDef {
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  title: string;
  description: string;
  priority: TaskPriority;
  relativeOffsetDays: number;
  dependsOnIndex?: number; // Index in the same pack for chaining
  estimatedCost?: number;
  linkedCategoryKey?: string;
  subtasks: { title: string }[];
}

export interface EventTaskTemplatePack {
  eventType: 'wedding' | 'birthday' | 'community';
  name: string;
  description: string;
  tasks: TemplateTaskDef[];
}

export const WEDDING_TASK_PACK: EventTaskTemplatePack = {
  eventType: 'wedding',
  name: 'Authentic Indian Wedding Checklist Pack',
  description: 'Complete 360-degree traditional celebration roadmap with granular Groom, Bride, Invitations and Ritual tracks.',
  tasks: [
    // --- 1. GROOM: ATTIRE & BESPOKE OUTFITS ---
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Attire & Styling',
      title: 'Groom outfit selection & fabric finalization',
      description: 'Select Royal Sherwani, safa fabric, stole, and matching accessories for the wedding ceremony.',
      priority: 'high',
      relativeOffsetDays: -60,
      estimatedCost: 65000,
      linkedCategoryKey: 'cat-outfits',
      subtasks: [
        { title: 'Visit designer boutique in C-Scheme Jaipur' },
        { title: 'Compare raw silk vs brocade fabric swatches' },
        { title: 'Approve embroidery pattern & colour theme (Pale Gold/Ivory)' },
      ],
    },
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Attire & Styling',
      title: 'Measurements & master tailor commissioning',
      description: 'Provide detailed bespoke measurements for sherwani, kurta, and churidar.',
      priority: 'high',
      relativeOffsetDays: -45,
      dependsOnIndex: 0,
      subtasks: [
        { title: 'Body measurements taken with master tailor' },
        { title: 'Finalize lining cloth & pocket specifications' },
      ],
    },
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Attire & Styling',
      title: 'Trial fitting and alteration checks',
      description: 'Attend intermediate trial fitting to verify shoulder cut, chest posture, and sleeve length.',
      priority: 'high',
      relativeOffsetDays: -25,
      dependsOnIndex: 1,
      subtasks: [
        { title: 'Try sherwani with inner kurta silhouette' },
        { title: 'Check sitting comfort for 2-hour mandap seating' },
        { title: 'Mark sleeve and collar minor hem adjustments' },
      ],
    },
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Attire & Styling',
      title: 'Final trial & wedding wardrobe steaming',
      description: 'Final fitting verification with shoes and accessories; pick up pressed outfits in garment bags.',
      priority: 'high',
      relativeOffsetDays: -7,
      dependsOnIndex: 2,
      subtasks: [
        { title: 'Final trial with complete accessories' },
        { title: 'Collect steamed sherwani, kurta, and churidar in protective covers' },
      ],
    },

    // --- 2. GROOM: FOOTWEAR & ACCESSORIES ---
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Footwear & Accessories',
      title: 'Bespoke Mojari footwear & accessory curation',
      description: 'Source handcrafted Rajasthani mojari, pearl kantha mala, kalangi for safa, and brooch.',
      priority: 'medium',
      relativeOffsetDays: -20,
      dependsOnIndex: 0,
      estimatedCost: 18000,
      linkedCategoryKey: 'cat-outfits',
      subtasks: [
        { title: 'Trial wear mojari shoes with thick socks for comfort' },
        { title: 'Pick emerald & pearl kantha necklace matching stole' },
        { title: 'Acquire antique finish royal kalangi for safa crest' },
      ],
    },

    // --- 3. GROOM: GROOMING & WELLNESS ---
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Grooming & Wellness',
      title: 'Grooming consultation & skincare preference',
      description: 'Hair styling trial, beard trim styling, and pre-wedding facial consultation.',
      priority: 'low',
      relativeOffsetDays: -10,
      subtasks: [
        { title: 'Pre-wedding salon package booking in Jaipur' },
        { title: 'Hair & beard trim 3 days before wedding date' },
        { title: 'Confirm wedding morning safa tying artist and beard stylist' },
      ],
    },

    // --- 4. GROOM: BARAAT LOGISTICS & TRANSPORT ---
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Baraat Logistics',
      title: 'Baraat wedding vehicle & vintage car reservation',
      description: 'Reserve vintage open-top convertible or decorated chariot for Groom Baraat procession.',
      priority: 'medium',
      relativeOffsetDays: -15,
      estimatedCost: 20000,
      linkedCategoryKey: 'cat-transport',
      subtasks: [
        { title: 'Inspect vintage vehicle condition and floral attachment points' },
        { title: 'Verify driver license, backup vehicle guarantee and toll permits' },
      ],
    },
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Baraat Logistics',
      title: 'Baraat route, police NOC & driver contact confirmation',
      description: 'Map out 800m Baraat assembly road, parking bay, and traffic clearance permissions.',
      priority: 'medium',
      relativeOffsetDays: -7,
      dependsOnIndex: 6,
      subtasks: [
        { title: 'Test drive Baraat road from hotel entrance to venue gate' },
        { title: 'Exchange contact with venue security officer & local station' },
      ],
    },

    // --- 5. GROOM: GUEST COORDINATION & RSVP ---
    {
      categoryId: 'groom',
      categoryName: 'Groom',
      subcategoryName: 'Guest Coordination',
      title: 'Groom-side guest list & hotel room allotment',
      description: 'Collect groom-side family guest counts, room allocation list, and dietary notes.',
      priority: 'high',
      relativeOffsetDays: -30,
      subtasks: [
        { title: 'Compile outstation relatives head count (approx 95 guests)' },
        { title: 'Assign 28 rooms at heritage guest wing' },
        { title: 'Prepare welcome kits and itinerary cards for guest rooms' },
      ],
    },

    // --- 6. INVITATIONS SEQUENCE (STRICT DEPENDENCY CHAIN) ---
    // Index 9: inv-1
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Guest Roster',
      title: 'Finalize master guest list & address registry',
      description: 'Consolidate groom and bride family lists, physical postal addresses, and phone numbers.',
      priority: 'high',
      relativeOffsetDays: -75,
      subtasks: [
        { title: 'Combine bride side and groom side address books' },
        { title: 'Verify 200 total invited family count' },
      ],
    },
    // Index 10: inv-2 (depends on 9)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Creative Design',
      title: 'Invitation card creative artwork & copy approval',
      description: 'Review Sanskrit shlokas, family names, function schedule, and venue address on artwork proof.',
      priority: 'high',
      relativeOffsetDays: -60,
      dependsOnIndex: 9,
      subtasks: [
        { title: 'Spellcheck all names and family gotra references' },
        { title: 'Approve botanical motif & foil stamping colors' },
      ],
    },
    // Index 11: inv-3 (depends on 10)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Proofing',
      title: 'Physical hard-copy print proof sign-off',
      description: 'Inspect physical press print proof for color bleed, paper gsm texture, and gold foiling quality.',
      priority: 'high',
      relativeOffsetDays: -50,
      dependsOnIndex: 10,
      subtasks: [
        { title: 'Inspect physical sample card from press' },
        { title: 'Confirm box lid magnet closure strength' },
      ],
    },
    // Index 12: inv-4 (depends on 11)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Production',
      title: 'Batch printing of 150 boxed wedding invitation sets',
      description: 'Commercial offset run of 150 luxury boxed cards with dry-fruit envelopes.',
      priority: 'high',
      relativeOffsetDays: -40,
      dependsOnIndex: 11,
      estimatedCost: 24000,
      linkedCategoryKey: 'cat-invitations',
      subtasks: [
        { title: 'Press print run underway in Jaipur press' },
        { title: 'Box assembly and gold ribbon binding' },
      ],
    },
    // Index 13: inv-5 (depends on 12)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Logistics',
      title: 'Collection & count verification from printer',
      description: 'Pick up completed batches from printer, verify count and inspect 10 random samples.',
      priority: 'medium',
      relativeOffsetDays: -30,
      dependsOnIndex: 12,
      subtasks: [
        { title: 'Count cartons and collect extra envelope spares' },
      ],
    },
    // Index 14: inv-6 (depends on 13)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'Distribution',
      title: 'Postal courier & hand distribution to VIP elders',
      description: 'Send registered speed posts for outstation relatives; personal in-hand visits with sweet boxes.',
      priority: 'high',
      relativeOffsetDays: -25,
      dependsOnIndex: 13,
      subtasks: [
        { title: 'Hand delivery itinerary to Jaipur elders' },
        { title: 'Dispatch speed-post couriers with tracking numbers' },
      ],
    },
    // Index 15: inv-7 (depends on 14)
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'RSVP Tracking',
      title: 'RSVP collection & attendance headcount follow-up',
      description: 'Phone call check-ins and WhatsApp RSVP response tracking 14 days before wedding.',
      priority: 'high',
      relativeOffsetDays: -14,
      dependsOnIndex: 14,
      subtasks: [
        { title: 'Update final guest count for caterer head guarantee' },
      ],
    },

    // --- 7. CATERING & BANQUET ---
    {
      categoryId: 'catering',
      categoryName: 'Catering',
      subcategoryName: 'Menu Planning',
      title: 'Menu tasting & live food counter selection',
      description: 'Taste Dal Baati Churma, Ker Sangri, and Rajasthani live chaat counter specialties.',
      priority: 'high',
      relativeOffsetDays: -30,
      estimatedCost: 350000,
      linkedCategoryKey: 'cat-catering',
      subtasks: [
        { title: 'Tasting session at caterer base kitchen' },
        { title: 'Confirm 2 dessert selections and live jalebi rabdi counter' },
        { title: 'Approve mineral water jar dispensers setup' },
      ],
    },

    // --- 8. RITUALS & PUJA ---
    {
      categoryId: 'rituals',
      categoryName: 'Rituals',
      subcategoryName: 'Panditji & Samagri',
      title: 'Panditji consultation & sacred puja samagri list',
      description: 'Meet family priest to confirm auspicious lagna muhurat and full list of havan materials.',
      priority: 'medium',
      relativeOffsetDays: -20,
      estimatedCost: 15000,
      linkedCategoryKey: 'cat-rituals',
      subtasks: [
        { title: 'Procure dry coconut, ghee, supari, and sacred gangajal' },
        { title: 'Arrange 4 floral varmala garlands and petal baskets' },
      ],
    },
  ],
};

export const BIRTHDAY_TASK_PACK: EventTaskTemplatePack = {
  eventType: 'birthday',
  name: 'Kids & Family Birthday Celebration Pack',
  description: 'Fun, vibrant planning roadmap covering themes, cakes, entertaining games, return gifts, and parent coordination.',
  tasks: [
    {
      categoryId: 'theme',
      categoryName: 'Theme & Cake',
      subcategoryName: 'Cake',
      title: 'Select birthday theme and custom flavour cake',
      description: 'Finalize superhero / fairy-tale theme, flavour swatches, and delivery window.',
      priority: 'high',
      relativeOffsetDays: -14,
      estimatedCost: 8000,
      subtasks: [
        { title: 'Pick flavor (Belgian Chocolate / Red Velvet)' },
        { title: 'Share reference sketch with baker' },
        { title: 'Confirm custom candle and cake knife placement' },
      ],
    },
    {
      categoryId: 'venue',
      categoryName: 'Venue & Play Area',
      subcategoryName: 'Play Zone',
      title: 'Inspect venue and safety barriers for child guests',
      description: 'Check soft play corners, emergency exits, and clean bathroom facilities.',
      priority: 'medium',
      relativeOffsetDays: -10,
      subtasks: [
        { title: 'Inspect foam mats and play zone barriers' },
        { title: 'Confirm sound decibel limit and party room airflow' },
      ],
    },
    {
      categoryId: 'entertainment',
      categoryName: 'Entertainment',
      subcategoryName: 'Games & Emcee',
      title: 'Book emcee host and plan party games schedule',
      description: 'Organize musical chairs, treasure hunt, and interactive quiz for kids and parents.',
      priority: 'high',
      relativeOffsetDays: -10,
      estimatedCost: 15000,
      subtasks: [
        { title: 'Curate games list suitable for 5-10 age group' },
        { title: 'Purchase game winner medals & prizes' },
        { title: 'Coordinate background kid music playlist' },
      ],
    },
    {
      categoryId: 'favors',
      categoryName: 'Return Favors',
      subcategoryName: 'Hampers',
      title: 'Order personalized return gift kits & packing',
      description: 'Custom art kits, storybooks and confectionery packed with theme ribbons.',
      priority: 'medium',
      relativeOffsetDays: -7,
      estimatedCost: 12000,
      subtasks: [
        { title: 'Order gift boxes according to RSVP list' },
        { title: 'Include customized name stickers for each child' },
      ],
    },
    {
      categoryId: 'invitations',
      categoryName: 'Invitations',
      subcategoryName: 'RSVP Follow-up',
      title: 'Send digital animated invitation cards via WhatsApp',
      description: 'Track responses from school classmates and family groups.',
      priority: 'high',
      relativeOffsetDays: -12,
      subtasks: [
        { title: 'Create vibrant Canva/video invitation' },
        { title: 'Send to parent WhatsApp groups' },
        { title: 'Confirm dietary allergies (nuts/gluten)' },
      ],
    },
    {
      categoryId: 'catering',
      categoryName: 'Catering',
      subcategoryName: 'Snacks & Treats',
      title: 'Finalize kids finger food and beverage menu',
      description: 'Crispy corn, mini burgers, pasta, fruit skewers, and fresh fruit lemonades.',
      priority: 'medium',
      relativeOffsetDays: -5,
      subtasks: [
        { title: 'Confirm portion sizes and disposable paper cutlery' },
        { title: 'Arrange dedicated water and juice dispenser counter' },
      ],
    },
  ],
};

export const COMMUNITY_TASK_PACK: EventTaskTemplatePack = {
  eventType: 'community',
  name: 'Community Festival & Civic Gathering Pack',
  description: 'Scalable civic management roadmap covering municipal permissions, stage AV, volunteer rosters, and crowd safety.',
  tasks: [
    {
      categoryId: 'permissions',
      categoryName: 'Permissions & Venue',
      subcategoryName: 'Civic Permits',
      title: 'Apply for municipal ground permit & police NOC',
      description: 'Submit route map, decibel declaration, and event timing to local administrative commissioner.',
      priority: 'high',
      relativeOffsetDays: -30,
      subtasks: [
        { title: 'File municipal ground reservation application' },
        { title: 'Obtain Police NOC and traffic clearance' },
        { title: 'Submit Fire Safety department notification' },
      ],
    },
    {
      categoryId: 'stage_av',
      categoryName: 'Stage & AV',
      subcategoryName: 'Sound & Power',
      title: 'Stage truss, sound system & silent backup generator setup',
      description: 'Contract 15kVA sound setup, dual cordless microphones, podium, and 25kVA generator.',
      priority: 'high',
      relativeOffsetDays: -20,
      estimatedCost: 60000,
      subtasks: [
        { title: 'Inspect stage stability and rain canopy' },
        { title: 'Conduct microphone sound check and feedback test' },
        { title: 'Position backup generator away from crowd walkways' },
      ],
    },
    {
      categoryId: 'safety',
      categoryName: 'Safety & Sanitation',
      subcategoryName: 'Crowd Flow',
      title: 'First aid medical station & fire extinguisher positioning',
      description: 'Coordinate with local nursing station for paramedic volunteer and emergency kit.',
      priority: 'high',
      relativeOffsetDays: -10,
      subtasks: [
        { title: 'Set up shaded medical booth near main entry gate' },
        { title: 'Place 4 dry-powder fire extinguishers near stage & generator' },
        { title: 'Display emergency helpline posters with coordinator phone numbers' },
      ],
    },
    {
      categoryId: 'volunteers',
      categoryName: 'Volunteers',
      subcategoryName: 'Rosters',
      title: 'Volunteer recruitment and shift roster briefing',
      description: 'Assign 20 community volunteers across parking, registration, seating, and water stations.',
      priority: 'medium',
      relativeOffsetDays: -7,
      subtasks: [
        { title: 'Issue color-coded volunteer badges or sashes' },
        { title: 'Conduct 30-minute on-site rehearsal and walkthrough' },
      ],
    },
    {
      categoryId: 'supplies',
      categoryName: 'Refreshments & Water',
      subcategoryName: 'Hydration',
      title: 'Potable water stations & eco-friendly meal distribution',
      description: 'Contract RO water cans with paper cups and hygienic community snack distribution.',
      priority: 'medium',
      relativeOffsetDays: -5,
      estimatedCost: 25000,
      subtasks: [
        { title: 'Install 6 hydration stations across the grounds' },
        { title: 'Place compostable dustbins every 20 meters' },
      ],
    },
  ],
};

export function getTaskPackForEventType(eventType: 'wedding' | 'birthday' | 'community'): EventTaskTemplatePack {
  switch (eventType) {
    case 'birthday':
      return BIRTHDAY_TASK_PACK;
    case 'community':
      return COMMUNITY_TASK_PACK;
    case 'wedding':
    default:
      return WEDDING_TASK_PACK;
  }
}

/**
 * Builds concrete TaskItem instances from a template pack with proper ID prefixes and dependency linking.
 */
export function buildTasksFromPack(
  pack: EventTaskTemplatePack,
  eventId: string
): TaskItem[] {
  const generatedTasks: TaskItem[] = [];

  pack.tasks.forEach((def, index) => {
    const taskId = `task-${eventId}-${index + 1}`;
    generatedTasks.push({
      id: taskId,
      eventId,
      categoryId: def.categoryId,
      categoryName: def.categoryName,
      subcategoryName: def.subcategoryName,
      title: def.title,
      description: def.description,
      status: 'todo',
      priority: def.priority,
      relativeOffsetDays: def.relativeOffsetDays,
      dependsOnIds: [], // Linked below
      estimatedCost: def.estimatedCost,
      linkedBudgetCategoryId: def.linkedCategoryKey,
      subtasks: def.subtasks.map((st, sIdx) => ({
        id: `st-${taskId}-${sIdx + 1}`,
        title: st.title,
        completed: false,
      })),
    });
  });

  // Second pass: resolve dependency indices to actual generated IDs
  pack.tasks.forEach((def, index) => {
    if (def.dependsOnIndex !== undefined && generatedTasks[def.dependsOnIndex]) {
      generatedTasks[index].dependsOnIds = [generatedTasks[def.dependsOnIndex].id];
    }
  });

  return generatedTasks;
}
