export type EventType = 'wedding' | 'birthday' | 'community';
export type EventTier = 'budget' | 'standard' | 'premium';
export type FoodPreference = 'vegetarian' | 'non-veg' | 'jain' | 'mixed';

export interface EventModel {
  id: string;
  name: string;
  type: EventType;
  city: string;
  state: string;
  eventDate?: string; // Optional: if undefined/empty, displays "Date to be confirmed"
  hasExactDate?: boolean; // Whether the event date is fixed or tentative/unconfirmed
  guestCount: number;
  currency: string;
  totalBudget: number;
  tier: EventTier;
  foodPreference: FoodPreference;
  functionCount: number;
  venueType: string;
  accommodationNeeded: boolean;
  traditions: string[];
  keyPriorities: string[];
  version: number;
  schemaVersion?: number;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  cateringModel: {
    chargeablePlates: number;
    sampleRatePerPlate: number;
    sampleExtras: number;
  };
}

export type PricingSourceType =
  | 'MODELLED_SAMPLE'
  | 'PUBLIC_INDICATIVE'
  | 'HISTORICAL_AGGREGATE'
  | 'USER_QUOTE'
  | 'VERIFIED_VENDOR_QUOTE'
  | 'CONTRACT';

export interface PricingEvidence {
  id: string;
  region: string;
  locality?: string;
  category: string;
  serviceTier: string;
  diet?: string;
  unit: string;
  estimateLowPaise: number;
  estimateBasePaise: number;
  estimateHighPaise: number;
  sourceType: PricingSourceType;
  sourceUrl?: string;
  originalDocumentRef?: string;
  capturedAt?: string;
  validUntil?: string;
  inclusions: string[];
  exclusions: string[];
  qualityChecks: {
    hasTaxIncluded: boolean;
    isDoubleCountProtected: boolean;
    isVerified: boolean;
  };
  label: string; // e.g. "MODELLED_SAMPLE - Illustrative sample, not a verified live offer"
}

export interface CateringEstimateParams {
  guestCount: number;
  chargeableCount?: number;
  perPlateRate: number;
  minimumGuarantee?: number;
  selectedEventsCount?: number;
  fixedCharges?: number;
  venuePackageInclusions?: {
    includesBasicStaff?: boolean;
    includesLiveCounters?: boolean;
    bundleCreditINR?: number;
  };
  applicableTaxes?: {
    taxIncludedInPlateRate: boolean;
    taxRatePercent: number; // e.g. 5 for 5% GST
  };
  extraCounters?: number;
  transport?: number;
}

export interface CateringEstimateResult {
  chargeablePlates: number;
  baseFoodCostINR: number;
  baseFoodCostPaise: number;
  extrasINR: number;
  extrasPaise: number;
  taxAmountINR: number;
  taxAmountPaise: number;
  bundleDeductionsINR: number;
  bundleDeductionsPaise: number;
  totalCostINR: number;
  totalCostPaise: number;
  effectiveRatePerPlate: number;
  breakdown: {
    foodSubtotal: number;
    extraCounters: number;
    transport: number;
    taxes: number;
    bundleCredit: number;
  };
}

export interface BudgetCategory {
  id: string;
  eventId: string;
  name: string;
  allocated: number;
  estimatedLow: number;
  estimatedBase: number;
  estimatedHigh: number;
  committed: number;
  paid: number;
  committedAmount?: number;
  paidAmount?: number;
  forecastFinal?: number;
  outstandingAmount?: number;
  sourceType: PricingSourceType | 'modelled' | 'public' | 'quoted' | 'verified' | 'contracted';
  confidence: 'low' | 'medium' | 'high';
  pricingSourceIds?: string[];
  inclusions: string[];
  exclusions: string[];
  notes?: string;
  isContingency?: boolean;
  color: string;
  icon: string;
}

export interface BudgetScenario {
  guestCount: number;
  stressPercentage: 0 | 10 | 20; // 0, 10% or 20% stress test
  plateRate?: number;
  extras?: number;
  useReserveToCoverOverrun?: boolean;
}

export interface BudgetAnalysisResult {
  totalBudgetINR: number;
  totalAllocatedINR: number;
  reserveAllocatedINR: number;
  remainingUnallocatedINR: number;
  totalCommittedINR: number;
  totalPaidINR: number;
  totalOutstandingINR: number;
  isBalanced: boolean;
  allocationVarianceINR: number;
  cateringEstimate: CateringEstimateResult;
  categories: BudgetCategory[];
  pricingEvidence: PricingEvidence[];
  sourceCoverage: {
    modelledSamplePercent: number;
    quotedPercent: number;
    verifiedPercent: number;
    contractedPercent: number;
  };
  reserveHealth: {
    originalReserveINR: number;
    revisedReserveINR: number;
    reserveConsumedINR: number;
    status: 'HEALTHY' | 'WARNING' | 'EXHAUSTED';
  };
  warnings: string[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type DirectoryType = 'family' | 'office' | 'community' | 'volunteers';

export interface TaskItem {
  id: string;
  eventId: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId?: string;
  ownerName?: string;
  ownerRole?: string;
  directoryType?: DirectoryType;
  dueDate?: string; // e.g. YYYY-MM-DD
  relativeOffsetDays?: number; // e.g. -60 means T-60 days
  dependsOnIds: string[];
  estimatedCost?: number;
  linkedBudgetCategoryId?: string;
  subtasks: SubTask[];
}

export interface VendorQuote {
  id: string;
  vendorName: string;
  category: string;
  city: string;
  rating: number;
  chargeBasis: string;
  rate: number;
  quantity: number;
  taxes: number;
  extras: number;
  totalCalculated: number;
  inclusions: string[];
  exclusions: string[];
  quoteDate?: string;
  validityDate: string;
  guestCount?: number;
  minimumGuarantee?: number;
  deposits?: number;
  linkedBudgetCategoryId?: string;
  status: 'review' | 'shortlisted' | 'rejected';
  sourceType?: 'USER_ENTERED' | 'MODELLED_SAMPLE' | 'DOCUMENT_EXTRACTED';
  sourceLabel: string;
  notes?: string;
  extractionMetadata?: {
    confidence: number;
    sourceFilename?: string;
    extractedAt: string;
    pageReferences?: string[];
  };
}

export interface PlacesVendorResult {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  phone?: string;
  isLivePlaces: boolean;
  sourceLabel: string;
  attributionHtml?: string;
  priceClarificationNotice: string;
}

export interface QuoteExtractionCandidate {
  vendorName: string;
  category: string;
  city: string;
  rate: number;
  quantity: number;
  taxes: number;
  extras: number;
  totalCalculated: number;
  inclusions: string[];
  exclusions: string[];
  validityDate: string;
  minimumGuarantee?: number;
  deposits?: number;
  confidence: number;
  sourceReferences: string[];
  notes?: string;
  untrustedPromptDetected?: boolean;
}

export interface InvitationDraftContent {
  title: string;
  language: 'en' | 'hi' | 'bilingual';
  shlokaOrBlessing?: string;
  hostsLine: string;
  invitationText: string;
  coupleOrHonorLine: string;
  dateAndMuhuratLine: string;
  venueLine: string;
  rsvpLine?: string;
  isDateConfirmed: boolean;
  notes?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  relation: string;
  directoryType: DirectoryType;
  email?: string;
  phone?: string;
  avatarBg: string;
  primaryResponsibilities: string[];
  status?: 'active' | 'invited';
  invitedAt?: string;
  invitedBy?: string;
}

export interface TaskModificationProposal {
  id: string;
  taskId?: string;
  title: string;
  categoryName: string;
  action: 'flag_review' | 'update_milestone' | 'create_followup' | 'update_count';
  selected: boolean;
  reason: string;
  vendorVerificationWarning?: string;
}

export interface ReplanAlternative {
  id: string;
  title: string;
  description: string;
  budgetDelta: number;
  contingencyDelta: number;
  isRecommended: boolean;
}

export interface ChangeProposal {
  id: string;
  eventId: string;
  baseVersion: number;
  title: string;
  description: string;
  intent?: 'UPDATE_GUESTS' | 'UPDATE_BUDGET' | 'CHANGE_DATE' | 'ADD_FUNCTION' | 'UPDATE_VENDOR_QUOTE' | 'ADD_TASK' | 'ASK_STATUS' | string;
  requestedChange?: string;
  impactSummary: {
    originalGuestCount: number;
    revisedGuestCount: number;
    originalCateringCost: number;
    revisedCateringCost: number;
    difference: number;
    originalReserve: number;
    revisedReserve: number;
    totalBudget: number;
    categoryDeltas?: { categoryId: string; name: string; currentAllocated: number; revisedAllocated: number; delta: number }[];
  };
  affectedTaskTitles: string[];
  taskModifications?: TaskModificationProposal[];
  alternatives?: ReplanAlternative[];
  chosenAlternativeId?: string;
  warnings?: string[];
  sourceEvidenceRefs?: string[];
  resolutionType: 'use_reserve' | 'reallocate_costs' | 'adjust_budget';
  status: 'pending' | 'approved' | 'rejected' | 'conflict_cancelled';
  applied: boolean;
  idempotencyKey?: string;
  createdAt: string;
  appliedAt?: string;
  reviewedBy?: string;
}

export interface ReplanAuditLogEntry {
  id: string;
  proposalId: string;
  eventId: string;
  baseVersion: number;
  newVersion: number;
  intent: string;
  approvedBy: string;
  approvedAt: string;
  idempotencyKey: string;
  changesSummary: string;
  budgetDeltaINR: number;
  contingencyDeltaINR: number;
  tasksModifiedCount: number;
}

export interface ReplanIntentResult {
  intent: 'UPDATE_GUESTS' | 'UPDATE_BUDGET' | 'CHANGE_DATE' | 'ADD_FUNCTION' | 'UPDATE_VENDOR_QUOTE' | 'ADD_TASK' | 'ASK_STATUS' | 'CLARIFICATION_NEEDED';
  confidence: number;
  explanation: string;
  extractedParameters: Record<string, any>;
  proposal?: ChangeProposal;
  clarificationPrompt?: string;
  suggestedQuickActions?: { label: string; action: string }[];
  simulated?: boolean;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  proposal?: ChangeProposal;
  quickActions?: { label: string; action: string }[];
}
