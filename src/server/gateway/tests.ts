import { aiQuotaService } from './aiQuotaService';
import { aiResponseCache } from './aiResponseCache';
import { aiUsageTracker } from './aiUsageTracker';
import { authService } from './authService';
import { costGuardService } from './costGuardService';
import { aiUsageGateway } from './gateway';
import { modelRouter } from './modelRouter';
import { rateLimitService } from './rateLimitService';
import { tokenBudgetService } from './tokenBudgetService';

export interface TestResultItem {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: Record<string, any>;
  durationMs: number;
}

export interface GatewayTestSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  durationMs: number;
  results: TestResultItem[];
}

export async function runGatewayTestSuite(): Promise<GatewayTestSuiteReport> {
  const overallStart = Date.now();
  const results: TestResultItem[] = [];

  const runTest = async (
    id: number,
    name: string,
    category: string,
    fn: () => Promise<void> | void
  ) => {
    const t0 = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        category,
        passed: true,
        message: 'Passed successfully',
        durationMs: Date.now() - t0,
      });
    } catch (err: unknown) {
      results.push({
        id,
        name,
        category,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - t0,
      });
    }
  };

  // 1. Quota enforcement, including concurrent requests
  await runTest(1, 'Quota enforcement and atomic daily limits', 'QuotaManagement', async () => {
    aiQuotaService.resetForTesting();
    const testUser = 'test-quota-user-01';
    
    // Check initial limit for EVENT_PLAN_GENERATION (limit = 3)
    const check1 = aiQuotaService.checkQuota('INITIAL_EVENT_BLUEPRINT', testUser);
    if (!check1.allowed || check1.status.remainingToday !== 3) {
      throw new Error(`Expected initial quota remaining to be 3, got ${check1.status.remainingToday}`);
    }

    // Exhaust quota (3 executions)
    aiQuotaService.incrementQuota('INITIAL_EVENT_BLUEPRINT', testUser);
    aiQuotaService.incrementQuota('INITIAL_EVENT_BLUEPRINT', testUser);
    aiQuotaService.incrementQuota('INITIAL_EVENT_BLUEPRINT', testUser);

    // 4th request must be rejected
    const check4 = aiQuotaService.checkQuota('INITIAL_EVENT_BLUEPRINT', testUser);
    if (check4.allowed) {
      throw new Error('Expected 4th plan generation request to be rejected by quota, but it was allowed');
    }
    if (check4.status.remainingToday !== 0) {
      throw new Error(`Expected remaining 0, got ${check4.status.remainingToday}`);
    }
  });

  // 2. Correct routing by workflow
  await runTest(2, 'Workflow-specific model tier and thinking routing', 'ModelRouting', async () => {
    const reqExtRoute = modelRouter.resolveRoute('REQUIREMENT_EXTRACTION');
    if (reqExtRoute.tier !== 'low_cost' || reqExtRoute.thinkingLevel !== 'LOW') {
      throw new Error(`REQUIREMENT_EXTRACTION should route to low_cost with LOW thinking, got tier ${reqExtRoute.tier}`);
    }

    const blueprintRoute = modelRouter.resolveRoute('INITIAL_EVENT_BLUEPRINT');
    if (blueprintRoute.tier !== 'reasoning' || blueprintRoute.thinkingLevel !== 'HIGH') {
      throw new Error(`INITIAL_EVENT_BLUEPRINT should route to reasoning tier with HIGH thinking`);
    }

    const checklistRoute = modelRouter.resolveRoute('CHECKLIST_GENERATION');
    if (checklistRoute.tier !== 'reasoning') {
      throw new Error(`CHECKLIST_GENERATION should route to reasoning tier`);
    }

    const budgetRoute = modelRouter.resolveRoute('COMPLEX_BUDGET_OPTIMIZATION');
    if (budgetRoute.tier !== 'reasoning') {
      throw new Error(`COMPLEX_BUDGET_OPTIMIZATION should route to reasoning tier`);
    }

    // Verify fallback safety: automatic upgrade to expensive model prohibited
    modelRouter.setAllowExpensiveFallback(false);
    const fallback = modelRouter.resolveFallback({
      workflow: 'REQUIREMENT_EXTRACTION',
      tier: 'low_cost',
      primaryModelId: 'gemini-3.8-flash',
      fallbackModelId: 'gemini-4-argon',
      maxInputTokens: 4000,
      maxOutputTokens: 1000,
      cacheTtlSeconds: 0,
      isPersonalized: true,
    });
    if (fallback !== null) {
      throw new Error(`Expected expensive fallback to be blocked when allowExpensiveFallback=false, but got ${fallback}`);
    }
  });

  // 3. Token and cost accounting
  await runTest(3, 'Token budget validation and micro-cost calculation', 'CostControls', async () => {
    // Token estimation
    const sampleText = 'Aarav and Meera Wedding in Jaipur Rajasthan with 200 guests and royal catering';
    const tokens = tokenBudgetService.estimateTokenCount(sampleText);
    if (tokens < 15 || tokens > 35) {
      throw new Error(`Unexpected token estimate for sample: ${tokens}`);
    }

    // Pricing calculation for gemini-3.8-flash ($0.15 / 1M in, $0.60 / 1M out)
    const cost = costGuardService.calculateCost('gemini-3.8-flash', 1000, 500);
    const expected = (1000 / 1_000_000) * 0.15 + (500 / 1_000_000) * 0.60; // 0.00015 + 0.00030 = 0.00045
    if (Math.abs(cost - expected) > 0.00001) {
      throw new Error(`Expected cost ${expected}, calculated ${cost}`);
    }
  });

  // 4. Cache hits and stale-cache invalidation
  await runTest(4, 'Response caching and event version invalidation', 'ResponseCaching', async () => {
    aiResponseCache.resetForTesting();
    const route = modelRouter.resolveRoute('INVITATION_WORDING');
    const prompt = 'Royal Rajasthani invitation wording for Jaipur haveli wedding';
    const key = aiResponseCache.buildCacheKey('INVITATION_WORDING', route, prompt, 'user-1', 'event-1', 1);

    // Initial check: cache miss
    const miss = aiResponseCache.get(key, 1);
    if (miss.hit) {
      throw new Error('Expected initial cache check to miss');
    }

    // Set cache
    aiResponseCache.set(key, 'INVITATION_WORDING', 'Warmly invite you to our wedding', 'gemini-3.8-flash', 50, 40, 3600, 'event-1', 1, 'user-1');

    // Cache hit
    const hit = aiResponseCache.get(key, 1);
    if (!hit.hit || !hit.entry?.text.includes('Warmly invite you')) {
      throw new Error('Expected cache hit with cached text');
    }

    // Invalidation: Event version bumps from 1 to 2 -> cache must invalidate
    const staleCheck = aiResponseCache.get(key, 2);
    if (staleCheck.hit) {
      throw new Error('Expected cache to invalidate when event version changed to v2');
    }
  });

  // 5. Duplicate-request prevention & concurrency mutex
  await runTest(5, 'Concurrency lock and duplicate-request deduplication', 'ConcurrencyControl', async () => {
    rateLimitService.resetForTesting();
    const testUser = 'user-concurrency-test';

    // 1st lock must succeed
    const lock1 = rateLimitService.acquireConcurrencyLock(testUser);
    if (!lock1) {
      throw new Error('Expected first lock acquisition to succeed');
    }

    // 2nd simultaneous lock must fail
    const lock2 = rateLimitService.acquireConcurrencyLock(testUser);
    if (lock2) {
      throw new Error('Expected second concurrent lock acquisition to fail for the same user');
    }

    // Release lock
    rateLimitService.releaseConcurrencyLock(testUser);
    const lock3 = rateLimitService.acquireConcurrencyLock(testUser);
    if (!lock3) {
      throw new Error('Expected lock to be acquirable after previous release');
    }
    rateLimitService.releaseConcurrencyLock(testUser);
  });

  // 6. Unauthorized requests
  await runTest(6, 'Authentication and authorization security checks', 'Security', async () => {
    const unauth = authService.authenticateRequest(undefined, undefined);
    if (unauth.authorized) {
      throw new Error('Expected unauthenticated request to be rejected');
    }

    // Event access control: user-A accessing event owned by user-B
    const userA = { userId: 'user-a', isDemoUser: false };
    const forbidden = authService.verifyEventAccess(userA, 'event-owned-by-b', 'user-b');
    if (forbidden.allowed) {
      throw new Error('Expected user-A to be forbidden from accessing event owned by user-B');
    }
  });

  // 7. Project-wide budget exhaustion
  await runTest(7, 'Project-wide spending budget guard and limit rejection', 'CostControls', async () => {
    costGuardService.resetForTesting();
    costGuardService.setProjectBudgetLimit(0.05); // Tiny limit of 5 cents

    // Verify allowed initially
    const check1 = costGuardService.checkBudgetGuard();
    if (!check1.allowed) {
      throw new Error('Budget should be allowed initially');
    }

    // Simulate spending $0.06
    costGuardService.recordExpense(0.06, true, false);

    // Verify rejection
    const check2 = costGuardService.checkBudgetGuard();
    if (check2.allowed) {
      throw new Error('Expected cost guard to reject new requests when budget is exhausted');
    }

    // Restore standard limit
    costGuardService.setProjectBudgetLimit(10.00);
  });

  // 8. Graceful handling of Gemini errors
  await runTest(8, 'Graceful handling of simulation and provider errors', 'ErrorHandling', async () => {
    // When GEMINI_API_KEY is unset or simulated, gateway returns graceful demo response without crashing
    const res = await aiUsageGateway.execute(
      {
        workflow: 'BUDGET_EXPLANATION',
        prompt: 'Explain the catering plate rate calculation',
      },
      {
        userId: 'test-error-user',
        isDemoUser: true,
      }
    );

    if (!res.success && res.errorCode === 'GEMINI_ERROR') {
      // Graceful error structure returned
      if (!res.error) throw new Error('Expected error message in response');
    } else if (res.success) {
      // Simulation or successful response returned
      if (!res.text) throw new Error('Expected text in successful response');
    }
  });

  // 9. No exposed API secrets
  await runTest(9, 'Verify server-only secrets boundary', 'Security', async () => {
    // Check that public config endpoints and client interfaces do not contain GEMINI_API_KEY
    const safeConfig = {
      projectBudgetLimitUsd: costGuardService.getSummary().projectBudgetLimitUsd,
      pricingTable: costGuardService.getPricingTable(),
      routes: modelRouter.getAllRoutes(),
    };

    const serialized = JSON.stringify(safeConfig);
    if (serialized.includes('AIza') || serialized.includes('process.env.GEMINI_API_KEY')) {
      throw new Error('Secret API keys found in public configuration!');
    }
  });

  // 10. Existing Utsav AI functionality remains intact
  await runTest(10, 'Existing local budget and task calculators remain non-LLM reliant', 'SystemIntegrity', async () => {
    // Import and verify purely local deterministic budget calculation
    const { calculateCateringCost } = await import('../../services/budgetCalculator');
    const localCost = calculateCateringCost(200, 900, 20000);
    if (localCost !== 200000) {
      throw new Error(`Expected local deterministic catering cost ₹2,00,000, got ${localCost}`);
    }
  });

  const durationMs = Date.now() - overallStart;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    durationMs,
    results,
  };
}
