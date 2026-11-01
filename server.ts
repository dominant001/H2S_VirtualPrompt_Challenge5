import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { aiUsageGateway } from './src/server/gateway/gateway';
import { runGatewayTestSuite } from './src/server/gateway/tests';
import { eventArchitectService } from './src/server/architect/intakeService';
import { runArchitectTestSuite } from './src/server/architect/tests';
import { budgetAdvisorService } from './src/server/budget/budgetAdvisor';
import { runBudgetTestSuite } from './src/server/budget/tests';
import { BudgetEngine } from './src/domain/budgetEngine';
import { checklistAdvisorService } from './src/server/checklist/checklistAdvisor';
import { runChecklistTestSuite } from './src/server/checklist/tests';
import { IntentRouter } from './src/server/replanning/intentRouter';
import { replanService } from './src/server/replanning/replanService';
import { runReplanningTestSuite } from './src/server/replanning/tests';
import { PlacesAdapter } from './src/server/vendors/placesAdapter';
import { QuoteExtractor } from './src/server/vendors/quoteExtractor';
import { InvitationAdvisor } from './src/server/inspiration/invitationAdvisor';
import { runVendorTestSuite } from './src/server/vendors/tests';
import { runHardeningTestSuite } from './src/server/hardening/tests';
import crypto from 'crypto';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Hardened Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Request ID and Structured Observability Logger
  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    res.setHeader('x-request-id', requestId);
    (req as any).requestId = requestId;

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      };
      if (req.path.startsWith('/api/') && !req.path.includes('/health')) {
        console.log(`[API_AUDIT] ${JSON.stringify(logEntry)}`);
      }
    });

    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Gateway Health Endpoint
  app.get('/api/gateway/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      geminiClientConfigured: aiUsageGateway.client.isAvailable(),
      cacheStats: aiUsageGateway.cache.getCacheStats(),
      spendingSummary: aiUsageGateway.costGuard.getSummary(),
      timestamp: new Date().toISOString(),
    });
  });

  // Gateway Safe Configuration Endpoint
  app.get('/api/gateway/config', (req: Request, res: Response) => {
    res.json({
      routes: aiUsageGateway.router.getAllRoutes(),
      pricingTable: aiUsageGateway.costGuard.getPricingTable(),
      spendingSummary: aiUsageGateway.costGuard.getSummary(),
      allowExpensiveFallback: aiUsageGateway.router.getAllowExpensiveFallback(),
    });
  });

  // User Quotas Status Endpoint
  app.get('/api/gateway/quotas', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || 'demo-user-guest';
    const eventId = req.query.eventId as string | undefined;
    const quotas = aiUsageGateway.quota.getAllStatuses(userId, eventId);
    res.json({
      userId,
      eventId,
      quotas,
    });
  });

  // Gateway Usage & Audit Logs Endpoint
  app.get('/api/gateway/usage', (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 30;
    const userId = req.query.userId as string | undefined;
    const eventId = req.query.eventId as string | undefined;
    const logs = aiUsageGateway.tracker.getRecentLogs(limit, userId, eventId);
    const summary = aiUsageGateway.costGuard.getSummary();
    const metricsByWorkflow = aiUsageGateway.tracker.getMetricsByWorkflow();

    res.json({
      summary,
      logs,
      metricsByWorkflow,
    });
  });

  // Main Gateway Execution Endpoint
  app.post('/api/gateway/execute', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const result = await aiUsageGateway.execute(req.body, undefined, authHeader);
      res.json(result);
    } catch (err: any) {
      console.error('[API Gateway Error]:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal Gateway Exception',
        errorCode: 'GEMINI_ERROR',
      });
    }
  });

  // Phase 3: Conversational Event Architect Intake Endpoint
  app.post('/api/ai/event-intake/chat', async (req: Request, res: Response) => {
    try {
      const { messages, currentDraft } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const result = await eventArchitectService.processMessage(messages || [], currentDraft, authHeader);
      res.json(result);
    } catch (err: any) {
      console.error('[Event Intake API Error]:', err);
      res.status(500).json({
        replyText: 'Sorry, I encountered an issue updating your draft.',
        draft: eventArchitectService.getInitialDraft(),
        followUpQuestions: ['Retry with standard wedding', 'Switch to manual form'],
        isComplete: false,
        simulated: true,
        error: err.message,
      });
    }
  });

  // Phase 3: Acceptance Tests Runner Endpoint
  app.post('/api/ai/event-intake/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runArchitectTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Architect Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Phase 4: Budget Analysis Tool Endpoint (Deterministic Math)
  app.post('/api/budget/analysis', (req: Request, res: Response) => {
    try {
      const { event, categories, scenario } = req.body;
      const analysis = BudgetEngine.getBudgetAnalysis(event, categories || [], scenario);
      res.json(analysis);
    } catch (err: any) {
      console.error('[Budget Analysis API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 4: Gemini Budget Advisory Endpoint (Advisory Grounded in Tool Math)
  app.post('/api/budget/advisory', async (req: Request, res: Response) => {
    try {
      const { event, categories, scenario } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const advisory = await budgetAdvisorService.generateBudgetAdvisory(
        event,
        categories || [],
        scenario || { guestCount: event.guestCount, stressPercentage: 0 },
        authHeader
      );
      res.json(advisory);
    } catch (err: any) {
      console.error('[Budget Advisory API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 4: Acceptance Tests Runner Endpoint
  app.post('/api/budget/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runBudgetTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Budget Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Phase 5: Gemini Task Expansion Preview Endpoint
  app.post('/api/checklist/expand', async (req: Request, res: Response) => {
    try {
      const { eventContext, category, existingTasks } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const result = await checklistAdvisorService.suggestTaskExpansion(
        eventContext || {},
        category || 'general',
        existingTasks || [],
        authHeader
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Checklist Expand API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 5: Checklist Gap & Blindspot Audit Endpoint
  app.post('/api/checklist/audit', async (req: Request, res: Response) => {
    try {
      const { eventContext, tasks } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const result = await checklistAdvisorService.auditChecklist(
        eventContext || {},
        tasks || [],
        authHeader
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Checklist Audit API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 5: Acceptance Tests Runner Endpoint
  app.post('/api/checklist/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runChecklistTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Checklist Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Run Test Suite Endpoint
  app.post('/api/gateway/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runGatewayTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Gateway Test Suite Error]:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to execute test suite',
      });
    }
  });

  // Phase 6: Natural Language Re-planning Intent Endpoint
  app.post('/api/replanning/intent', async (req: Request, res: Response) => {
    try {
      const { text, event, categories, tasks } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const userId = (req.body.userId as string) || 'demo-user-guest';

      const intentResult = await IntentRouter.classifyIntent(text || '', authHeader, userId);

      // If intent is UPDATE_GUESTS or UPDATE_BUDGET and event is provided, generate candidate proposal
      if (intentResult.intent === 'UPDATE_GUESTS' && event && categories && tasks) {
        const newGuestCount = intentResult.extractedParameters.newGuestCount || 250;
        const proposal = replanService.createChangeProposal(
          event,
          categories,
          tasks,
          newGuestCount
        );
        intentResult.proposal = proposal;
      }

      res.json(intentResult);
    } catch (err: any) {
      console.error('[Re-planning Intent Error]:', err);
      res.status(500).json({
        intent: 'CLARIFICATION_NEEDED',
        confidence: 0,
        explanation: 'Failed to parse re-planning intent: ' + err.message,
        extractedParameters: {},
      });
    }
  });

  // Phase 6: Generate Candidate Change Proposal Endpoint
  app.post('/api/replanning/proposal/create', (req: Request, res: Response) => {
    try {
      const { event, categories, tasks, targetGuestCount, idempotencyKey } = req.body;
      const proposal = replanService.createChangeProposal(
        event,
        categories || [],
        tasks || [],
        targetGuestCount || 250,
        idempotencyKey
      );
      res.json(proposal);
    } catch (err: any) {
      console.error('[Create Proposal Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 6: Approve Change Proposal Endpoint
  app.post('/api/replanning/proposal/approve', (req: Request, res: Response) => {
    try {
      const { event, categories, tasks, proposalId, idempotencyKey, userContext, selectedTaskIds, alternativeId } = req.body;

      // Cross-Account Access Security Check
      if (
        event &&
        event.ownerId &&
        userContext &&
        !userContext.isDemoUser &&
        event.ownerId !== userContext.userId
      ) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Cross-account access denied: Event ownership mismatch.',
        });
      }

      const result = replanService.approveProposal(
        event,
        categories || [],
        tasks || [],
        proposalId,
        idempotencyKey,
        userContext,
        { selectedTaskIds, alternativeId }
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Approve Proposal Error]:', err);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });

  // Phase 6: Reject Change Proposal Endpoint
  app.post('/api/replanning/proposal/reject', (req: Request, res: Response) => {
    try {
      const { proposalId, reason, userContext } = req.body;
      const result = replanService.rejectProposal(proposalId, reason, userContext);
      res.json(result);
    } catch (err: any) {
      console.error('[Reject Proposal Error]:', err);
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  });

  // Phase 6: Acceptance Tests Runner Endpoint (Tests A–F)
  app.post('/api/replanning/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runReplanningTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Replanning Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Phase 7: Vendor Discovery via Places Adapter
  app.get('/api/vendors/search', async (req: Request, res: Response) => {
    try {
      const city = (req.query.city as string) || 'Jaipur';
      const category = (req.query.category as string) || 'Catering';
      const radiusKm = Number(req.query.radiusKm) || 25;
      const results = await PlacesAdapter.searchVendors(city, category, radiusKm);
      res.json(results);
    } catch (err: any) {
      console.error('[Vendors Search Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7: Gemini Vendor Quote Document Extractor
  app.post('/api/vendors/extract-quote', async (req: Request, res: Response) => {
    try {
      const { rawText, filename, mimeType, fileSizeBytes } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const userId = (req.body.userId as string) || 'demo-user-guest';

      const candidate = await QuoteExtractor.extractQuote({
        rawText: rawText || '',
        filename,
        mimeType,
        fileSizeBytes,
        userId,
        authHeader,
      });
      res.json(candidate);
    } catch (err: any) {
      console.error('[Quote Extraction Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7: Gemini Invitation Copy Generator
  app.post('/api/inspiration/generate-invitation', async (req: Request, res: Response) => {
    try {
      const { event, language, tone, hostsLine, coupleOrHonorName, customRequests } = req.body;
      const authHeader = req.headers.authorization || 'Bearer demo-user-guest';
      const userId = (req.body.userId as string) || 'demo-user-guest';

      const invitation = await InvitationAdvisor.generateInvitation({
        event,
        language: language || 'en',
        tone: tone || 'traditional_royal',
        hostsLine,
        coupleOrHonorName,
        customRequests,
        userId,
        authHeader,
      });
      res.json(invitation);
    } catch (err: any) {
      console.error('[Generate Invitation Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7: Community Event Sponsor Proposal Generator
  app.post('/api/inspiration/sponsor-proposal', (req: Request, res: Response) => {
    try {
      const { event } = req.body;
      const proposal = InvitationAdvisor.generateSponsorProposal(event);
      res.json(proposal);
    } catch (err: any) {
      console.error('[Sponsor Proposal Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Phase 7: Acceptance Tests Runner Endpoint (Tests A–F)
  app.post('/api/vendors/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runVendorTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Vendor Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Phase 8: Hardening & Jury Demo Acceptance Tests Runner Endpoint (Matrix 1–10)
  app.post('/api/hardening/run-tests', async (req: Request, res: Response) => {
    try {
      const report = await runHardeningTestSuite();
      res.json(report);
    } catch (err: any) {
      console.error('[Hardening Test Suite Error]:', err);
      res.status(500).json({
        allPassed: false,
        error: err.message,
      });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Utsav AI] Server & AI Usage Gateway listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
