import React, { useEffect, useState } from 'react';
import {
  aiGatewayClient,
  GatewayHealthData,
} from '../../services/aiGatewayClient';
import {
  AIUsageLogEntry,
  AIWorkflow,
  CostSummary,
  GatewayExecuteResponse,
  QuotaStatus,
} from '../../server/gateway/types';
import { GatewayTestSuiteReport } from '../../server/gateway/tests';
import { eventArchitectClient } from '../../services/eventArchitectClient';
import { Phase3TestReport } from '../../server/architect/tests';
import { budgetIntelligenceClient } from '../../services/budgetIntelligenceClient';
import { Phase4TestReport } from '../../server/budget/tests';
import { ChecklistClient } from '../../services/checklistClient';
import { Phase5Report } from '../../server/checklist/tests';
import { replanningClient } from '../../services/replanningClient';
import { ReplanTestSuiteReport } from '../../server/replanning/tests';
import { vendorClient } from '../../services/vendorClient';
import { Phase7TestSuiteReport } from '../../server/vendors/tests';
import { HardeningClient } from '../../services/hardeningClient';
import { HardeningTestSuiteReport } from '../../server/hardening/tests';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Cpu,
  ShieldCheck,
  Zap,
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  Database,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const AIGatewayControlSection: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { activeEvent, showToast } = useApp();

  const [health, setHealth] = useState<GatewayHealthData | null>(null);
  const [quotas, setQuotas] = useState<QuotaStatus[]>([]);
  const [usageLogs, setUsageLogs] = useState<AIUsageLogEntry[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [testReport, setTestReport] = useState<GatewayTestSuiteReport | null>(null);
  const [runningTests, setRunningTests] = useState(false);
  const [architectTestReport, setArchitectTestReport] = useState<{
    allPassed: boolean;
    totalTests: number;
    passCount: number;
    results: Phase3TestReport[];
    timestamp: string;
  } | null>(null);
  const [runningArchitectTests, setRunningArchitectTests] = useState(false);
  const [budgetTestReport, setBudgetTestReport] = useState<{
    allPassed: boolean;
    totalTests: number;
    passCount: number;
    results: Phase4TestReport[];
    timestamp: string;
  } | null>(null);
  const [runningBudgetTests, setRunningBudgetTests] = useState(false);
  const [checklistTestReport, setChecklistTestReport] = useState<Phase5Report | null>(null);
  const [runningChecklistTests, setRunningChecklistTests] = useState(false);
  const [replanTestReport, setReplanTestReport] = useState<ReplanTestSuiteReport | null>(null);
  const [runningReplanTests, setRunningReplanTests] = useState(false);
  const [vendorTestReport, setVendorTestReport] = useState<Phase7TestSuiteReport | null>(null);
  const [runningVendorTests, setRunningVendorTests] = useState(false);
  const [hardeningTestReport, setHardeningTestReport] = useState<HardeningTestSuiteReport | null>(null);
  const [runningHardeningTests, setRunningHardeningTests] = useState(false);
  const [loading, setLoading] = useState(true);

  // Interactive Test Execution State
  const [testWorkflow, setTestWorkflow] = useState<AIWorkflow>('INVITATION_WORDING');
  const [testPrompt, setTestPrompt] = useState(
    'Draft an elegant Rajasthani royal wedding invitation card for Aarav and Meera in Jaipur with family blessings.'
  );
  const [executingPrompt, setExecutingPrompt] = useState(false);
  const [lastResponse, setLastResponse] = useState<GatewayExecuteResponse | null>(null);

  const effectiveUserId = user?.uid || (isDemoMode ? 'demo-user-guest' : 'demo-user-guest');

  const refreshData = async () => {
    try {
      const [healthData, userQuotas, usageData] = await Promise.all([
        aiGatewayClient.getHealth(),
        aiGatewayClient.getQuotas(effectiveUserId, activeEvent?.id),
        aiGatewayClient.getUsageLogs(effectiveUserId),
      ]);

      if (healthData) setHealth(healthData);
      if (userQuotas) setQuotas(userQuotas);
      if (usageData) {
        setUsageLogs(usageData.logs);
        setCostSummary(usageData.summary);
      }
    } catch (err) {
      console.warn('Error fetching gateway stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [effectiveUserId, activeEvent?.id]);

  const handleRunTests = async () => {
    setRunningTests(true);
    try {
      const report = await aiGatewayClient.runTests();
      setTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} AI Gateway & Security tests passed!`, 'success');
      } else {
        showToast(
          `Gateway tests: ${report.passedCount} passed, ${report.failedCount} failed`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Test suite execution failed: ${err.message}`, 'error');
    } finally {
      setRunningTests(false);
    }
  };

  const handleRunArchitectTests = async () => {
    setRunningArchitectTests(true);
    try {
      const report = await eventArchitectClient.runAcceptanceTests();
      setArchitectTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 3 Event Architect acceptance tests passed!`, 'success');
      } else {
        showToast(
          `Architect tests: ${report.passCount} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 3 test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningArchitectTests(false);
    }
  };

  const handleRunBudgetTests = async () => {
    setRunningBudgetTests(true);
    try {
      const report = await budgetIntelligenceClient.runTests();
      setBudgetTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 4 Evidence-Aware Budget tests passed!`, 'success');
      } else {
        showToast(
          `Budget tests: ${report.passCount} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 4 budget test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningBudgetTests(false);
    }
  };

  const handleRunChecklistTests = async () => {
    setRunningChecklistTests(true);
    try {
      const report = await ChecklistClient.runAcceptanceTests();
      setChecklistTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 5 Smart Checklist acceptance tests passed!`, 'success');
      } else {
        showToast(
          `Checklist tests: ${report.passedTests} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 5 checklist test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningChecklistTests(false);
    }
  };

  const handleRunReplanningTests = async () => {
    setRunningReplanTests(true);
    try {
      const report = await replanningClient.runTests();
      setReplanTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 6 Re-planning tests passed!`, 'success');
      } else {
        showToast(
          `Re-planning tests: ${report.passCount} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 6 re-planning test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningReplanTests(false);
    }
  };

  const handleRunVendorTests = async () => {
    setRunningVendorTests(true);
    try {
      const report = await vendorClient.runTests();
      setVendorTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 7 Acceptance tests passed!`, 'success');
      } else {
        showToast(
          `Phase 7 tests: ${report.passCount} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 7 test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningVendorTests(false);
    }
  };

  const handleRunHardeningTests = async () => {
    setRunningHardeningTests(true);
    try {
      const report = await HardeningClient.runTests();
      setHardeningTestReport(report);
      if (report.allPassed) {
        showToast(`All ${report.totalTests} Phase 8 Hardening Matrix tests passed!`, 'success');
      } else {
        showToast(
          `Phase 8 tests: ${report.passCount} passed out of ${report.totalTests}`,
          'warning'
        );
      }
      refreshData();
    } catch (err: any) {
      showToast(`Phase 8 test suite failed: ${err.message}`, 'error');
    } finally {
      setRunningHardeningTests(false);
    }
  };

  const handleExecuteSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPrompt.trim()) return;

    setExecutingPrompt(true);
    try {
      const res = await aiGatewayClient.execute(
        {
          workflow: testWorkflow,
          prompt: testPrompt,
          eventId: activeEvent?.id,
          eventVersion: activeEvent?.version || 1,
        },
        effectiveUserId,
        isDemoMode
      );

      setLastResponse(res);
      if (res.success) {
        const cacheTag = res.cacheHit ? ' [Cache Hit - $0.00]' : '';
        showToast(
          `Gateway executed via ${res.modelId}: ${res.tokenUsage.totalTokens} tokens ($${res.estimatedCostUsd.toFixed(5)})${cacheTag}`,
          'success'
        );
      } else {
        showToast(`Gateway rejected request: ${res.error}`, 'error');
      }
      refreshData();
    } catch (err: any) {
      showToast(`Gateway execution error: ${err.message}`, 'error');
    } finally {
      setExecutingPrompt(false);
    }
  };

  const spentUsd = costSummary?.totalSpentUsd ?? 0;
  const limitUsd = costSummary?.projectBudgetLimitUsd ?? 10.0;
  const budgetPercent = Math.min(100, Math.round((spentUsd / (limitUsd || 1)) * 100));

  return (
    <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#231530]/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E06D28] to-[#9A380E] text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#231530] text-base font-display">
                AI Usage Gateway & Billing Control
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Server-Side Gemini
              </span>
            </div>
            <p className="text-xs text-[#231530]/60">
              Centralized quota management, token budgets, response caching, and project spending guards
            </p>
          </div>
        </div>

        <button
          onClick={refreshData}
          disabled={loading}
          className="p-2 rounded-xl border border-[#231530]/10 hover:bg-[#FAF7F2] text-[#231530]/70 transition-colors cursor-pointer"
          title="Refresh Gateway Metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Cards: Cost Guard, Concurrency & Security, Caching */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cost Guard */}
        <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Project Spending Limit
            </span>
            <span className="font-mono text-emerald-700 font-semibold">
              ${spentUsd.toFixed(4)} / ${limitUsd.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                budgetPercent > 80 ? 'bg-rose-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-[#231530]/50 flex justify-between pt-0.5">
            <span>{budgetPercent}% budget consumed</span>
            <span>Threshold rejection: {costSummary?.isBudgetExhausted ? 'ACTIVE' : 'READY'}</span>
          </div>
        </div>

        {/* Security & Concurrency */}
        <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              Security & Credentials
            </span>
            <span className="text-[10px] font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
              Server Only
            </span>
          </div>
          <div className="text-sm font-semibold text-[#231530]">
            Zero Client-Side Exposure
          </div>
          <div className="text-[11px] text-[#231530]/60">
            Protected via server proxy, auth headers, and 1 active request mutex per user
          </div>
        </div>

        {/* Response Cache Performance */}
        <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Response Cache
            </span>
            <span className="font-mono text-amber-700 font-semibold text-xs">
              {health?.cacheStats ? `${health.cacheStats.size} entries` : '0 entries'}
            </span>
          </div>
          <div className="text-sm font-semibold text-[#231530]">
            {Math.round((costSummary?.cacheHitRatio || 0) * 100)}% Cache Hit Ratio
          </div>
          <div className="text-[11px] text-[#231530]/60">
            SHA-256 deduplicated, $0 cost repeat responses, auto-invalidates on event edits
          </div>
        </div>
      </div>

      {/* User Daily Quotas Visualizer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#231530]/70 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#E06D28]" />
            Your Daily Usage Quotas ({effectiveUserId.slice(0, 14)})
          </h4>
          <span className="text-[11px] text-[#231530]/50 font-mono">
            Resets at 23:59 UTC
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {quotas.map((q) => {
            const isExhausted = q.remainingToday <= 0;
            const pct = q.dailyLimit > 0 ? Math.round((q.usedToday / q.dailyLimit) * 100) : 100;
            return (
              <div
                key={q.key}
                className="p-3 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#231530] truncate pr-2">
                    {q.key.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isExhausted
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {q.usedToday} / {q.dailyLimit}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isExhausted ? 'bg-rose-500' : 'bg-[#E06D28]'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#231530]/50 flex justify-between">
                  <span>{q.remainingToday} remaining today</span>
                  <span>{q.dailyLimit === 0 ? 'Disabled' : 'Active'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Routing Architecture Table */}
      <div className="space-y-2 pt-2">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-[#231530]/70 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          Configured Model Tier Routing
        </h4>
        <div className="overflow-x-auto rounded-xl border border-[#231530]/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#231530]/10 text-[#231530]/70">
                <th className="py-2.5 px-3 font-semibold">Workflow</th>
                <th className="py-2.5 px-3 font-semibold">Model Tier</th>
                <th className="py-2.5 px-3 font-semibold">Configured Model</th>
                <th className="py-2.5 px-3 font-semibold">Reasoning Level</th>
                <th className="py-2.5 px-3 font-semibold">Max Tokens</th>
                <th className="py-2.5 px-3 font-semibold">Cache TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#231530]/5 font-sans">
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Requirement Extraction</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-medium text-[11px]">Low-cost</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px]">LOW</td>
                <td className="py-2 px-3 font-mono text-[11px]">4K In / 1K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">1 hour</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Initial Event Blueprint</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-medium text-[11px]">Reasoning</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px] font-bold text-purple-700">HIGH</td>
                <td className="py-2 px-3 font-mono text-[11px]">8K In / 2.5K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">24 hours</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Checklist Generation</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-medium text-[11px]">Reasoning</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px] font-bold text-purple-700">HIGH</td>
                <td className="py-2 px-3 font-mono text-[11px]">6K In / 2K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">24 hours</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Budget Explanation</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-medium text-[11px]">Low-cost</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px]">LOW</td>
                <td className="py-2 px-3 font-mono text-[11px]">4K In / 1.2K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">2 hours</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Complex Budget Optimization</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-medium text-[11px]">Reasoning</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px] font-bold text-purple-700">HIGH</td>
                <td className="py-2 px-3 font-mono text-[11px]">8K In / 2.5K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">1 hour</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Event Re-planning</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-medium text-[11px]">Reasoning</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px] font-bold text-purple-700">HIGH</td>
                <td className="py-2 px-3 font-mono text-[11px]">8K In / 2.5K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">1 hour</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium text-[#231530]">Invitation Wording</td>
                <td className="py-2 px-3"><span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-medium text-[11px]">Low-cost</span></td>
                <td className="py-2 px-3 font-mono text-[11px]">gemini-3.8-flash</td>
                <td className="py-2 px-3 font-mono text-[11px]">LOW</td>
                <td className="py-2 px-3 font-mono text-[11px]">3K In / 1.5K Out</td>
                <td className="py-2 px-3 text-[#231530]/60">24 hours (Generic)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Gateway Test Execution Console */}
      <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E06D28]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
              Test Gateway Invocation & Cost Accounting
            </span>
          </div>
          <span className="text-[11px] text-[#231530]/60">
            Real Gateway Request Pipeline
          </span>
        </div>

        <form onSubmit={handleExecuteSample} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={testWorkflow}
              onChange={(e) => setTestWorkflow(e.target.value as AIWorkflow)}
              className="text-xs p-2 bg-white rounded-lg border border-[#231530]/20 font-medium text-[#231530]"
            >
              <option value="INVITATION_WORDING">Invitation Wording (Low-Cost)</option>
              <option value="BUDGET_EXPLANATION">Budget Explanation (Low-Cost)</option>
              <option value="CHECKLIST_GENERATION">Checklist Advice (Reasoning)</option>
              <option value="GENERAL_CHAT">General Chat Message (Low-Cost)</option>
            </select>

            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Prompt for gateway execution..."
              className="sm:col-span-2 text-xs p-2 bg-white rounded-lg border border-[#231530]/20 text-[#231530]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[#231530]/60 font-mono">
              Pricing: $0.15/1M in · $0.60/1M out
            </div>

            <button
              type="submit"
              disabled={executingPrompt}
              className="px-4 py-2 bg-[#E06D28] hover:bg-[#C95C1E] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{executingPrompt ? 'Routing via Gateway...' : 'Execute via Gateway'}</span>
            </button>
          </div>
        </form>

        {lastResponse && (
          <div className="p-3 bg-white rounded-lg border border-[#231530]/10 text-xs space-y-2 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#231530]/10 pb-2">
              <span className="font-semibold text-[#231530] flex items-center gap-1.5">
                {lastResponse.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                {lastResponse.success ? 'Gateway Execution Succeeded' : 'Gateway Rejected Request'}
              </span>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-[#231530]/60">Model: {lastResponse.modelId}</span>
                <span>·</span>
                <span className="text-emerald-700 font-bold">
                  Cost: ${lastResponse.estimatedCostUsd.toFixed(5)}
                </span>
                <span>·</span>
                <span className="text-indigo-700">
                  {lastResponse.tokenUsage.totalTokens} tokens
                </span>
                {lastResponse.cacheHit && (
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-sm font-sans text-[10px]">
                    Cache Hit
                  </span>
                )}
              </div>
            </div>

            <div className="text-[#231530] font-sans text-xs whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
              {lastResponse.text || lastResponse.error}
            </div>
          </div>
        )}
      </div>

      {/* Automated 10-Suite Verification Runner */}
      <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-700" />
            <span className="font-bold text-xs uppercase tracking-wider text-indigo-950">
              Gateway Architecture & Quota Test Suite (10 Requirements)
            </span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={runningTests}
            className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningTests ? 'Running Test Suite...' : 'Run Automated Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-indigo-900/80">
          Runs automated programmatic assertions covering concurrency locks, quota exhaustion, workflow routing, token accounting, cache invalidation, and budget caps.
        </p>

        {testReport && (
          <div className="space-y-2 pt-2 border-t border-indigo-100">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={testReport.allPassed ? 'text-emerald-700' : 'text-rose-700'}>
                {testReport.passedCount} / {testReport.totalTests} Tests Passed ({testReport.durationMs}ms)
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(testReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {testReport.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2 rounded-lg border flex items-start gap-2 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-xs truncate">
                      {r.id}. {r.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {r.category} · {r.durationMs}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 3: Gemini Event Architect Acceptance Suite (Tests A to F) */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E06D28]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
              Phase 3: Gemini Event Architect Acceptance Suite (Tests A–F)
            </span>
          </div>

          <button
            onClick={handleRunArchitectTests}
            disabled={runningArchitectTests}
            className="px-3.5 py-1.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningArchitectTests ? 'Testing Architect...' : 'Run Phase 3 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Validates standard intake extraction (Test A), bidirectional form sync & confirm persistence (Test B), tentative null date boundary (Test C), bilingual Hindi handling (Test D), fault-tolerant recovery & simulation labeling (Test E), and read-only financial booking boundaries (Test F).
        </p>

        {architectTestReport && (
          <div className="space-y-2 pt-2 border-t border-amber-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={architectTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {architectTestReport.passCount} / {architectTestReport.totalTests} Phase 3 Acceptance Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(architectTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {architectTestReport.results.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.notes}</div>
                    {r.extracted && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.extracted)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 4: Evidence-Aware Budget Intelligence Acceptance Suite (Tests A to F) */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
              Phase 4: Evidence-Aware Budget Intelligence Acceptance Suite (Tests A–F)
            </span>
          </div>

          <button
            onClick={handleRunBudgetTests}
            disabled={runningBudgetTests}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningBudgetTests ? 'Testing Budget Engine...' : 'Run Phase 4 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Validates exact ₹12L allocation &amp; ₹1.8L reserve (Test A), catering baseline 200 × ₹900 + ₹20K = ₹2,00,000 (Test B), 250 guest sensitivity yields ₹2,45,000 (+₹45K) (Test C), negative input rejections &amp; tax/bundle invariants (Test D), explicit MODELLED_SAMPLE and unverified user quote labeling (Test E), and Gemini numerical consistency with tool math without unilateral persistence (Test F).
        </p>

        {budgetTestReport && (
          <div className="space-y-2 pt-2 border-t border-emerald-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={budgetTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {budgetTestReport.passCount} / {budgetTestReport.totalTests} Phase 4 Acceptance Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(budgetTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {budgetTestReport.results.map((r, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.notes}</div>
                    {r.data && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.data)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 5: Smart Checklist & Timeline Intelligence Acceptance Suite (Tests A to G) */}
      <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
              Phase 5: Smart Checklist &amp; Timeline Intelligence Acceptance Suite (Tests A–G)
            </span>
          </div>

          <button
            onClick={handleRunChecklistTests}
            disabled={runningChecklistTests}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningChecklistTests ? 'Testing Checklist Engine...' : 'Run Phase 5 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Validates detailed Groom group microtasks (Test A), leaf task progress roll-up (Test B), 7-step invitation dependency chain &amp; cycle rejection (Test C), date uncertainty &amp; Asia/Kolkata timezone milestones (Test D), Gemini expansion preview deduplication (Test E), multi-event template packs (Wedding, Birthday, Community) (Test F), and role/access security enforcement (Test G).
        </p>

        {checklistTestReport && (
          <div className="space-y-2 pt-2 border-t border-purple-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={checklistTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {checklistTestReport.passedTests} / {checklistTestReport.totalTests} Phase 5 Acceptance Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(checklistTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {checklistTestReport.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.details}</div>
                    {r.data && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.data)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 6: Cross-Feature Intelligent Re-planning Acceptance Suite (Tests A to F) */}
      <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#E06D28]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
              Phase 6: Cross-Feature Intelligent Re-planning Acceptance Suite (Tests A–F)
            </span>
          </div>

          <button
            onClick={handleRunReplanningTests}
            disabled={runningReplanTests}
            className="px-3.5 py-1.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningReplanTests ? 'Testing Re-planning Engine...' : 'Run Phase 6 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Validates that preview alone makes zero data changes (Test A), cancel/reject preserves exact baseline (Test B), approving Option A transfers ₹45,000 from contingency reserve to catering preserving strictly ₹12L celebration cap (Test C), task impact review flags unconfirmed vendor capacity with selective checkboxes (Test D), concurrent baseVersion mismatches &amp; replay attempts prevent double-allocation (Test E), and Gemini cannot bypass authorization, math, or evidence rules (Test F).
        </p>

        {replanTestReport && (
          <div className="space-y-2 pt-2 border-t border-orange-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={replanTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {replanTestReport.passCount} / {replanTestReport.totalTests} Phase 6 Acceptance Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(replanTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {replanTestReport.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.notes}</div>
                    {r.data && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.data)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 7 Acceptance Test Suite Runner */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-purple-500/10 rounded-2xl border border-amber-300/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif font-bold text-sm text-[#231530] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Phase 7 Acceptance Suite: Vendor Discovery, Inspiration &amp; Exports
            </h4>
            <p className="text-xs text-[#231530]/70">
              Deterministic verification of Places boundaries, Gemini quote extraction with injection defense, multilingual invitation generator with date-uncertainty guard, sponsor proposals, and downloadable PDF summary.
            </p>
          </div>
          <button
            onClick={handleRunVendorTests}
            disabled={runningVendorTests}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-xl text-xs font-semibold hover:from-amber-700 hover:to-rose-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningVendorTests ? 'Testing Phase 7 Suite...' : 'Run Phase 7 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Validates that Places API search enforces zero-hallucinated plate rates (Test A), apples-to-apples quotation comparison accurately calculates taxes, extras, and effective rate/plate (Test B), untrusted vendor PDF extraction resists prompt injection and extracts structured line items (Test C), multilingual invitation composition respects tentative dates when exact date is unconfirmed (Test D), community sponsor proposals mark packages with PROPOSED_SPONSOR flags (Test E), and PDF brief export compiles clean multi-page document with legal disclaimer (Test F).
        </p>

        {vendorTestReport && (
          <div className="space-y-2 pt-2 border-t border-amber-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={vendorTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {vendorTestReport.passCount} / {vendorTestReport.totalTests} Phase 7 Acceptance Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(vendorTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {vendorTestReport.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.notes}</div>
                    {r.data && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.data)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase 8 Hardening & Jury Acceptance Matrix Runner */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 rounded-2xl border border-emerald-300/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif font-bold text-sm text-[#231530] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Phase 8 Acceptance Suite: Security, Reliability, Deployment &amp; Jury Matrix
            </h4>
            <p className="text-xs text-[#231530]/70">
              10-Point automated verification of new user persistence, ₹12L integer balance math, reserve replenishment invariants, groom microtasks, cross-account denial, and graceful degradation.
            </p>
          </div>
          <button
            onClick={handleRunHardeningTests}
            disabled={runningHardeningTests}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningHardeningTests ? 'Testing Phase 8 Matrix...' : 'Run Phase 8 Tests'}</span>
          </button>
        </div>

        <p className="text-xs text-[#231530]/80">
          Evaluates all 10 non-negotiable demonstration requirements: Jaipur wedding persistence (Matrix 1), ₹12L balanced allocation math (Matrix 2), 200→250 proposal +₹45k &amp; ₹1.35L reserve (Matrix 3), groom micro-tasks &amp; dependencies (Matrix 4), non-mutating task expansion (Matrix 5), quote source-type visual distinction (Matrix 6), cross-account read/write denial (Matrix 7), labeled degraded modes (Matrix 8), real PDF &amp; Places exports (Matrix 9), and 360px mobile accessibility &amp; zero-NaN runtime invariants (Matrix 10).
        </p>

        {hardeningTestReport && (
          <div className="space-y-2 pt-2 border-t border-emerald-200/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={hardeningTestReport.allPassed ? 'text-emerald-700' : 'text-amber-800'}>
                {hardeningTestReport.passCount} / {hardeningTestReport.totalTests} Phase 8 Matrix Criteria Passed
              </span>
              <span className="text-[11px] text-[#231530]/50 font-mono">
                {new Date(hardeningTestReport.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              {hardeningTestReport.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    r.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-[#231530]">{r.name}</div>
                    <div className="text-[11px] text-[#231530]/70 mt-0.5">{r.notes}</div>
                    {r.data && (
                      <div className="mt-1 font-mono text-[10px] text-neutral-600 bg-white/70 px-2 py-0.5 rounded border border-neutral-200 inline-block">
                        {JSON.stringify(r.data)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Usage & Audit Logs */}
      <div className="space-y-2">
        <h4 className="font-semibold text-xs uppercase tracking-wider text-[#231530]/70 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-neutral-600" />
          Recent Gateway Audit Logs ({usageLogs.length})
        </h4>

        {usageLogs.length === 0 ? (
          <div className="p-4 bg-[#FAF7F2] rounded-xl text-center text-xs text-[#231530]/50 border border-[#231530]/10">
            No AI requests logged yet today. Use the interactive prompt above or Copilot to generate planning requests.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#231530]/10 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#FAF7F2] border-b border-[#231530]/10 text-[#231530]/70">
                <tr>
                  <th className="py-2 px-3 font-semibold">Time</th>
                  <th className="py-2 px-3 font-semibold">Workflow</th>
                  <th className="py-2 px-3 font-semibold">Model</th>
                  <th className="py-2 px-3 font-semibold">Tokens</th>
                  <th className="py-2 px-3 font-semibold">Cost (USD)</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#231530]/5 font-sans">
                {usageLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="py-1.5 px-3 font-mono text-[11px] text-[#231530]/60">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 px-3 font-medium text-[#231530]">
                      {log.workflow.replace(/_/g, ' ')}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-[#231530]/70">
                      {log.modelId}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px]">
                      {log.inputTokens + log.outputTokens}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-emerald-700 font-semibold">
                      ${log.estimatedCostUsd.toFixed(5)}
                    </td>
                    <td className="py-1.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'QUOTA_EXCEEDED'
                            ? 'bg-amber-100 text-amber-800'
                            : log.status === 'BUDGET_EXHAUSTED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.cacheHit ? 'CACHE HIT' : log.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[11px] text-[#231530]/60">
                      {log.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
