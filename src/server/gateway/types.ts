/**
 * Types and interfaces for the Utsav AI - AI Usage Gateway & Billing Control
 */

export type AIWorkflow =
  | 'REQUIREMENT_EXTRACTION'
  | 'INITIAL_EVENT_BLUEPRINT'
  | 'CHECKLIST_GENERATION'
  | 'BUDGET_EXPLANATION'
  | 'COMPLEX_BUDGET_OPTIMIZATION'
  | 'RE_PLANNING'
  | 'USER_SUMMARY'
  | 'INVITATION_WORDING'
  | 'GENERAL_CHAT';

export type AIModelTier = 'low_cost' | 'reasoning' | 'premium';

export interface ModelPricing {
  modelId: string;
  effectiveDate: string; // ISO date string, e.g. '2025-01-01'
  inputCostPerMillion: number; // in USD
  outputCostPerMillion: number; // in USD
  notes?: string;
}

export interface ModelRouteConfig {
  workflow: AIWorkflow;
  tier: AIModelTier;
  primaryModelId: string;
  fallbackModelId?: string;
  allowExpensiveFallback?: boolean;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  maxInputTokens: number;
  maxOutputTokens: number;
  temperature?: number;
  cacheTtlSeconds: number; // 0 = do not cache
  isPersonalized: boolean; // if true, cache key incorporates event version and user scope
}

export interface QuotaPolicy {
  key: string;
  name: string;
  description: string;
  scope: 'user' | 'event';
  dailyLimit: number;
  enabled: boolean;
}

export interface QuotaStatus {
  key: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  resetsAt: string;
}

export interface GatewayUserContext {
  userId: string;
  email?: string;
  isDemoUser: boolean;
  isAdmin?: boolean;
}

export interface GatewayRequestPayload {
  workflow: AIWorkflow;
  eventId?: string;
  eventVersion?: number;
  prompt: string;
  systemInstruction?: string;
  contextData?: Record<string, any>;
  bypassCache?: boolean;
}

export interface TokenUsageReport {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIUsageLogEntry {
  id: string;
  userId: string;
  eventId?: string;
  workflow: AIWorkflow;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  status: 'SUCCESS' | 'ERROR' | 'QUOTA_EXCEEDED' | 'BUDGET_EXHAUSTED' | 'RATE_LIMITED' | 'REJECTED';
  timestamp: string;
  durationMs: number;
  cacheHit: boolean;
  errorMessage?: string;
}

export interface CostSummary {
  totalSpentUsd: number;
  projectBudgetLimitUsd: number;
  remainingBudgetUsd: number;
  isBudgetExhausted: boolean;
  totalRequestsCount: number;
  successfulRequestsCount: number;
  failedRequestsCount: number;
  cacheHitRatio: number;
}

export interface GatewayExecuteResponse {
  success: boolean;
  text?: string;
  workflow: AIWorkflow;
  modelId: string;
  tokenUsage: TokenUsageReport;
  estimatedCostUsd: number;
  cacheHit: boolean;
  quotaStatus?: QuotaStatus;
  durationMs: number;
  error?: string;
  errorCode?:
    | 'QUOTA_EXCEEDED'
    | 'BUDGET_EXHAUSTED'
    | 'RATE_LIMITED'
    | 'CONCURRENT_REQUEST'
    | 'UNAUTHORIZED'
    | 'INVALID_INPUT'
    | 'GEMINI_ERROR'
    | 'CACHE_ERROR';
}
