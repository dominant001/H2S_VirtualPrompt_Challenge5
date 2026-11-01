import { AIWorkflow, ModelPricing, ModelRouteConfig, QuotaPolicy } from './types';

/**
 * Verified Gemini Models from system guidelines:
 * - Low-cost / Standard: 'gemini-3.8-flash'
 * - Reasoning: 'gemini-3.8-flash' (with thinkingLevel: HIGH) or 'gemini-4-argon' (paid)
 * - Ultra Low-Cost: 'gemini-3.1-flash-lite'
 */
export const AVAILABLE_MODELS = {
  FLASH: 'gemini-3.8-flash',
  FLASH_LITE: 'gemini-3.1-flash-lite',
  ARGON_PRO: 'gemini-4-argon',
} as const;

/**
 * Configurable Model Pricing Table (with effective dates).
 * Rates based on standard Gemini 3.8 / 3.1 published tiers.
 */
export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  'gemini-3.8-flash': {
    modelId: 'gemini-3.8-flash',
    effectiveDate: '2025-01-01',
    inputCostPerMillion: 0.15, // $0.15 per 1M tokens
    outputCostPerMillion: 0.60, // $0.60 per 1M tokens
    notes: 'Default workhorse model for text and medium reasoning',
  },
  'gemini-3.1-flash-lite': {
    modelId: 'gemini-3.1-flash-lite',
    effectiveDate: '2025-01-01',
    inputCostPerMillion: 0.075, // $0.075 per 1M tokens
    outputCostPerMillion: 0.30, // $0.30 per 1M tokens
    notes: 'High throughput ultra low-cost tier',
  },
  'gemini-4-argon': {
    modelId: 'gemini-4-argon',
    effectiveDate: '2025-01-01',
    inputCostPerMillion: 2.50, // $2.50 per 1M tokens
    outputCostPerMillion: 10.00, // $10.00 per 1M tokens
    notes: 'Deep reasoning model (paid tier only)',
  },
};

/**
 * Model routing configuration by workflow:
 * - Low-cost workflows: REQUIREMENT_EXTRACTION, BUDGET_EXPLANATION, USER_SUMMARY, INVITATION_WORDING, GENERAL_CHAT
 * - Reasoning workflows: INITIAL_EVENT_BLUEPRINT, CHECKLIST_GENERATION, COMPLEX_BUDGET_OPTIMIZATION, RE_PLANNING
 */
export const WORKFLOW_ROUTING_CONFIG: Record<AIWorkflow, ModelRouteConfig> = {
  REQUIREMENT_EXTRACTION: {
    workflow: 'REQUIREMENT_EXTRACTION',
    tier: 'low_cost',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'LOW',
    maxInputTokens: 4000,
    maxOutputTokens: 1000,
    cacheTtlSeconds: 3600, // 1 hour
    isPersonalized: true,
  },
  INITIAL_EVENT_BLUEPRINT: {
    workflow: 'INITIAL_EVENT_BLUEPRINT',
    tier: 'reasoning',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'HIGH',
    maxInputTokens: 8000,
    maxOutputTokens: 2500,
    cacheTtlSeconds: 86400, // 24 hours (templates are reusable)
    isPersonalized: true,
  },
  CHECKLIST_GENERATION: {
    workflow: 'CHECKLIST_GENERATION',
    tier: 'reasoning',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'HIGH',
    maxInputTokens: 6000,
    maxOutputTokens: 2000,
    cacheTtlSeconds: 86400, // 24 hours
    isPersonalized: true,
  },
  BUDGET_EXPLANATION: {
    workflow: 'BUDGET_EXPLANATION',
    tier: 'low_cost',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'LOW',
    maxInputTokens: 4000,
    maxOutputTokens: 1200,
    cacheTtlSeconds: 7200, // 2 hours
    isPersonalized: true,
  },
  COMPLEX_BUDGET_OPTIMIZATION: {
    workflow: 'COMPLEX_BUDGET_OPTIMIZATION',
    tier: 'reasoning',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'HIGH',
    maxInputTokens: 8000,
    maxOutputTokens: 2500,
    cacheTtlSeconds: 3600, // 1 hour
    isPersonalized: true,
  },
  RE_PLANNING: {
    workflow: 'RE_PLANNING',
    tier: 'reasoning',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'HIGH',
    maxInputTokens: 8000,
    maxOutputTokens: 2500,
    cacheTtlSeconds: 3600, // 1 hour
    isPersonalized: true,
  },
  USER_SUMMARY: {
    workflow: 'USER_SUMMARY',
    tier: 'low_cost',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'LOW',
    maxInputTokens: 3000,
    maxOutputTokens: 800,
    cacheTtlSeconds: 3600, // 1 hour
    isPersonalized: true,
  },
  INVITATION_WORDING: {
    workflow: 'INVITATION_WORDING',
    tier: 'low_cost',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'LOW',
    maxInputTokens: 3000,
    maxOutputTokens: 1500,
    cacheTtlSeconds: 86400, // 24 hours (wording templates are highly reusable)
    isPersonalized: false, // generic wording patterns can be shared
  },
  GENERAL_CHAT: {
    workflow: 'GENERAL_CHAT',
    tier: 'low_cost',
    primaryModelId: AVAILABLE_MODELS.FLASH,
    thinkingLevel: 'LOW',
    maxInputTokens: 4000,
    maxOutputTokens: 1500,
    cacheTtlSeconds: 1800, // 30 minutes
    isPersonalized: true,
  },
};

/**
 * Initial Quota Policies (Server-side enforced):
 * - Event plan generation: 3 requests/user/day
 * - Checklist generation: 2 requests/event/day
 * - Budget optimization: 5 requests/event/day
 * - Re-planning: 5 requests/event/day
 * - General AI chat: 20 messages/user/day
 * - Image generation: disabled by default
 */
export const INITIAL_QUOTA_POLICIES: Record<string, QuotaPolicy> = {
  EVENT_PLAN_GENERATION: {
    key: 'EVENT_PLAN_GENERATION',
    name: 'Event Plan Generation',
    description: 'Initial celebration blueprint and full itinerary generation',
    scope: 'user',
    dailyLimit: 3,
    enabled: true,
  },
  CHECKLIST_GENERATION: {
    key: 'CHECKLIST_GENERATION',
    name: 'Checklist Generation',
    description: 'Custom checklist expansion and vendor milestone planning',
    scope: 'event',
    dailyLimit: 2,
    enabled: true,
  },
  BUDGET_OPTIMIZATION: {
    key: 'BUDGET_OPTIMIZATION',
    name: 'Budget Optimization',
    description: 'Category reallocation and scenario modeling',
    scope: 'event',
    dailyLimit: 5,
    enabled: true,
  },
  RE_PLANNING: {
    key: 'RE_PLANNING',
    name: 'Event Re-planning',
    description: 'Guest count adjustments, contingency absorption, and rescheduling',
    scope: 'event',
    dailyLimit: 5,
    enabled: true,
  },
  GENERAL_CHAT: {
    key: 'GENERAL_CHAT',
    name: 'Utsav Copilot Messages',
    description: 'Interactive conversation and guidance questions',
    scope: 'user',
    dailyLimit: 20,
    enabled: true,
  },
  IMAGE_GENERATION: {
    key: 'IMAGE_GENERATION',
    name: 'Image Generation',
    description: 'AI-generated visual moodboards and themes',
    scope: 'user',
    dailyLimit: 0,
    enabled: false, // Disabled by default as required
  },
};

/**
 * Mapping from AIWorkflow to QuotaPolicy key
 */
export const WORKFLOW_TO_QUOTA_KEY: Record<AIWorkflow, string> = {
  INITIAL_EVENT_BLUEPRINT: 'EVENT_PLAN_GENERATION',
  CHECKLIST_GENERATION: 'CHECKLIST_GENERATION',
  COMPLEX_BUDGET_OPTIMIZATION: 'BUDGET_OPTIMIZATION',
  BUDGET_EXPLANATION: 'BUDGET_OPTIMIZATION',
  RE_PLANNING: 'RE_PLANNING',
  GENERAL_CHAT: 'GENERAL_CHAT',
  REQUIREMENT_EXTRACTION: 'GENERAL_CHAT',
  USER_SUMMARY: 'GENERAL_CHAT',
  INVITATION_WORDING: 'GENERAL_CHAT',
};

/**
 * Gateway Global Configuration
 */
export const GATEWAY_CONFIG = {
  // Application-defined spending budget threshold (USD)
  PROJECT_BUDGET_LIMIT_USD: 10.00,
  
  // Rate limiting parameters
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute sliding window
  MAX_REQUESTS_PER_WINDOW: 12,     // Max 12 requests per user per minute
  
  // Concurrency controls
  MAX_CONCURRENT_REQUESTS_PER_USER: 1, // Only 1 active generation at a time
  
  // Timeout for Gemini calls
  REQUEST_TIMEOUT_MS: 25000, // 25 seconds
  
  // Cache maximum in-memory entries
  MAX_CACHE_ENTRIES: 500,
  
  // Max request prompt size (characters)
  MAX_PROMPT_CHARS: 12000,
  
  // Disallow automatic fallback to expensive models unless explicitly configured
  ALLOW_EXPENSIVE_FALLBACK: false,
};
