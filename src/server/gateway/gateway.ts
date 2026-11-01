import { aiQuotaService } from './aiQuotaService';
import { aiResponseCache } from './aiResponseCache';
import { aiUsageTracker } from './aiUsageTracker';
import { authService } from './authService';
import { costGuardService } from './costGuardService';
import { geminiClient } from './geminiClient';
import { modelRouter } from './modelRouter';
import { rateLimitService } from './rateLimitService';
import { tokenBudgetService } from './tokenBudgetService';
import {
  GatewayExecuteResponse,
  GatewayRequestPayload,
  GatewayUserContext,
  TokenUsageReport,
} from './types';

export class AIUsageGateway {
  public auth = authService;
  public rateLimiter = rateLimitService;
  public quota = aiQuotaService;
  public router = modelRouter;
  public tokenBudget = tokenBudgetService;
  public cache = aiResponseCache;
  public client = geminiClient;
  public tracker = aiUsageTracker;
  public costGuard = costGuardService;

  /**
   * Main entry point for all AI operations in Utsav AI.
   */
  public async execute(
    payload: GatewayRequestPayload,
    userContext?: GatewayUserContext,
    authHeader?: string
  ): Promise<GatewayExecuteResponse> {
    const startTime = Date.now();
    const { workflow, eventId, eventVersion = 1, prompt, systemInstruction, contextData, bypassCache } = payload;

    // 1. Authentication & Authorization
    let user = userContext;
    if (!user) {
      const effectiveAuth = authHeader || ((payload as any).userId ? `Bearer ${(payload as any).userId}` : 'Bearer demo-user-guest');
      const effectiveUserId = (payload as any).userId || (authHeader ? undefined : 'demo-user-guest');
      const authResult = this.auth.authenticateRequest(effectiveAuth, effectiveUserId);
      if (!authResult.authorized || !authResult.user) {
        return this.errorResponse(
          workflow,
          'UNAUTHORIZED',
          authResult.error || 'Authentication required',
          startTime
        );
      }
      user = authResult.user;
    }

    const accessCheck = this.auth.verifyEventAccess(user, eventId, (payload as any).eventOwnerId);
    if (!accessCheck.allowed) {
      return this.errorResponse(workflow, 'UNAUTHORIZED', accessCheck.error || 'Event access denied', startTime);
    }

    // 2. Input sanitization & token budget check
    const routeConfig = this.router.resolveRoute(workflow);
    const budgetCheck = this.tokenBudget.validateInputBudget(prompt, routeConfig);
    if (!budgetCheck.valid) {
      return this.errorResponse(
        workflow,
        'INVALID_INPUT',
        budgetCheck.error || 'Input prompt exceeds token limits',
        startTime,
        routeConfig.primaryModelId
      );
    }

    // 3. Sliding-window rate limit check
    const rateCheck = this.rateLimiter.checkRateLimit(user.userId);
    if (!rateCheck.allowed) {
      this.tracker.logRequest({
        userId: user.userId,
        eventId,
        workflow,
        modelId: routeConfig.primaryModelId,
        inputTokens: budgetCheck.estimatedInputTokens,
        outputTokens: 0,
        estimatedCostUsd: 0,
        status: 'RATE_LIMITED',
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        cacheHit: false,
        errorMessage: rateCheck.error,
      });

      return this.errorResponse(
        workflow,
        'RATE_LIMITED',
        rateCheck.error || 'Rate limit exceeded',
        startTime,
        routeConfig.primaryModelId
      );
    }

    // 4. Concurrency lock (1 active LLM request per user at a time)
    const lockAcquired = this.rateLimiter.acquireConcurrencyLock(user.userId);
    if (!lockAcquired) {
      return this.errorResponse(
        workflow,
        'CONCURRENT_REQUEST',
        'Another AI request is already in progress for your account. Please wait for it to complete.',
        startTime,
        routeConfig.primaryModelId
      );
    }

    // Deduplication key
    const dedupeKey = `dedupe:${user.userId}:${workflow}:${this.cache.hashContent(prompt, contextData)}`;

    // In-flight request deduplication check
    const inFlight = this.rateLimiter.getInFlightPromise<GatewayExecuteResponse>(dedupeKey);
    if (inFlight) {
      this.rateLimiter.releaseConcurrencyLock(user.userId);
      return inFlight;
    }

    const executionPromise: Promise<GatewayExecuteResponse> = (async (): Promise<GatewayExecuteResponse> => {
      try {
        // 5. Daily Quota Check
        const quotaCheck = this.quota.checkQuota(workflow, user.userId, eventId);
        if (!quotaCheck.allowed) {
          this.tracker.logRequest({
            userId: user.userId,
            eventId,
            workflow,
            modelId: routeConfig.primaryModelId,
            inputTokens: budgetCheck.estimatedInputTokens,
            outputTokens: 0,
            estimatedCostUsd: 0,
            status: 'QUOTA_EXCEEDED',
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            cacheHit: false,
            errorMessage: quotaCheck.error,
          });

          return {
            success: false,
            workflow,
            modelId: routeConfig.primaryModelId,
            tokenUsage: { promptTokens: budgetCheck.estimatedInputTokens, completionTokens: 0, totalTokens: budgetCheck.estimatedInputTokens },
            estimatedCostUsd: 0,
            cacheHit: false,
            quotaStatus: quotaCheck.status,
            durationMs: Date.now() - startTime,
            error: quotaCheck.error,
            errorCode: 'QUOTA_EXCEEDED' as const,
          };
        }

        // 6. Project-Wide Budget Check (Cost Guard)
        const budgetGuard = this.costGuard.checkBudgetGuard();
        if (!budgetGuard.allowed) {
          this.tracker.logRequest({
            userId: user.userId,
            eventId,
            workflow,
            modelId: routeConfig.primaryModelId,
            inputTokens: budgetCheck.estimatedInputTokens,
            outputTokens: 0,
            estimatedCostUsd: 0,
            status: 'BUDGET_EXHAUSTED',
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            cacheHit: false,
            errorMessage: budgetGuard.error,
          });

          return {
            success: false,
            workflow,
            modelId: routeConfig.primaryModelId,
            tokenUsage: { promptTokens: budgetCheck.estimatedInputTokens, completionTokens: 0, totalTokens: budgetCheck.estimatedInputTokens },
            estimatedCostUsd: 0,
            cacheHit: false,
            quotaStatus: quotaCheck.status,
            durationMs: Date.now() - startTime,
            error: budgetGuard.error,
            errorCode: 'BUDGET_EXHAUSTED' as const,
          };
        }

        // 7. Response Cache Check
        const cacheKey = this.cache.buildCacheKey(
          workflow,
          routeConfig,
          prompt,
          user.userId,
          eventId,
          eventVersion,
          contextData
        );

        if (!bypassCache) {
          const cached = this.cache.get(cacheKey, eventVersion);
          if (cached.hit && cached.entry) {
            const durationMs = Date.now() - startTime;
            const tokenUsage: TokenUsageReport = {
              promptTokens: cached.entry.inputTokens,
              completionTokens: cached.entry.outputTokens,
              totalTokens: cached.entry.inputTokens + cached.entry.outputTokens,
            };

            // Cached responses incur $0 additional spend
            this.costGuard.recordExpense(0, true, true);
            this.tracker.logRequest({
              userId: user.userId,
              eventId,
              workflow,
              modelId: cached.entry.modelId,
              inputTokens: tokenUsage.promptTokens,
              outputTokens: tokenUsage.completionTokens,
              estimatedCostUsd: 0,
              status: 'SUCCESS',
              timestamp: new Date().toISOString(),
              durationMs,
              cacheHit: true,
            });

            return {
              success: true,
              text: cached.entry.text,
              workflow,
              modelId: cached.entry.modelId,
              tokenUsage,
              estimatedCostUsd: 0,
              cacheHit: true,
              quotaStatus: quotaCheck.status,
              durationMs,
            };
          }
        }

        // 8. Gemini API Invocation
        let genResult: { text: string; rawResponse?: any; simulated: boolean };
        try {
          genResult = await this.client.generateText(routeConfig, prompt, systemInstruction);
        } catch (genError: any) {
          // Log failed operation
          const durationMs = Date.now() - startTime;
          this.costGuard.recordExpense(0, false, false);
          this.tracker.logRequest({
            userId: user.userId,
            eventId,
            workflow,
            modelId: routeConfig.primaryModelId,
            inputTokens: budgetCheck.estimatedInputTokens,
            outputTokens: 0,
            estimatedCostUsd: 0,
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            durationMs,
            cacheHit: false,
            errorMessage: genError.message || 'Gemini error',
          });

          let friendlyError = genError.message || 'Upstream provider error';
          if (friendlyError.includes('402') || friendlyError.includes('prepayment credits') || friendlyError.includes('depleted')) {
            friendlyError = 'Gemini API credits depleted on attached Google Cloud project. Please check billing at https://ai.studio/projects or Secrets panel.';
          } else if (friendlyError.includes('429') || friendlyError.includes('RESOURCE_EXHAUSTED')) {
            friendlyError = 'Gemini API provider rate limit reached. Please retry in a moment.';
          }

          return {
            success: false,
            workflow,
            modelId: routeConfig.primaryModelId,
            tokenUsage: { promptTokens: budgetCheck.estimatedInputTokens, completionTokens: 0, totalTokens: budgetCheck.estimatedInputTokens },
            estimatedCostUsd: 0,
            cacheHit: false,
            quotaStatus: quotaCheck.status,
            durationMs,
            error: `AI Generation notice: ${friendlyError}`,
            errorCode: 'GEMINI_ERROR',
          };
        }

        // 9. Token Accounting & Cost Calculation
        const tokenUsage = this.tokenBudget.extractUsageReport(
          genResult.rawResponse,
          prompt,
          genResult.text
        );
        const estimatedCost = this.costGuard.calculateCost(
          routeConfig.primaryModelId,
          tokenUsage.promptTokens,
          tokenUsage.completionTokens
        );

        // Record spending
        this.costGuard.recordExpense(estimatedCost, true, false);

        // 10. Increment Quota atomically
        const updatedQuota = this.quota.incrementQuota(workflow, user.userId, eventId);

        // 11. Cache Storage (if TTL configured)
        if (routeConfig.cacheTtlSeconds > 0) {
          this.cache.set(
            cacheKey,
            workflow,
            genResult.text,
            routeConfig.primaryModelId,
            tokenUsage.promptTokens,
            tokenUsage.completionTokens,
            routeConfig.cacheTtlSeconds,
            eventId,
            eventVersion,
            user.userId
          );
        }

        // 12. Audit Logging
        const durationMs = Date.now() - startTime;
        this.tracker.logRequest({
          userId: user.userId,
          eventId,
          workflow,
          modelId: routeConfig.primaryModelId,
          inputTokens: tokenUsage.promptTokens,
          outputTokens: tokenUsage.completionTokens,
          estimatedCostUsd: estimatedCost,
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
          durationMs,
          cacheHit: false,
        });

        return {
          success: true,
          text: genResult.text,
          workflow,
          modelId: routeConfig.primaryModelId,
          tokenUsage,
          estimatedCostUsd: estimatedCost,
          cacheHit: false,
          quotaStatus: updatedQuota,
          durationMs,
        };
      } finally {
        this.rateLimiter.releaseConcurrencyLock(user.userId);
      }
    })();

    this.rateLimiter.registerInFlightPromise(dedupeKey, executionPromise);
    return executionPromise;
  }

  private errorResponse(
    workflow: any,
    errorCode: GatewayExecuteResponse['errorCode'],
    error: string,
    startTime: number,
    modelId: string = 'gemini-3.8-flash'
  ): GatewayExecuteResponse {
    return {
      success: false,
      workflow,
      modelId,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      estimatedCostUsd: 0,
      cacheHit: false,
      durationMs: Date.now() - startTime,
      error,
      errorCode,
    };
  }
}

export const aiUsageGateway = new AIUsageGateway();
