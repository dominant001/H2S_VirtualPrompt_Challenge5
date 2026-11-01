import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatINRCompact } from '../../utils/currency';
import {
  Sliders,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  RotateCcw,
  Plus,
  X,
  ShieldCheck,
  FileText,
  DollarSign,
  TrendingUp,
  Layers,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import { BudgetEngine, SAMPLE_JAIPUR_EVIDENCE } from '../../domain/budgetEngine';
import { budgetIntelligenceClient } from '../../services/budgetIntelligenceClient';
import { BudgetAnalysisResult, PricingEvidence } from '../../types';

export const BudgetStudioScreen: React.FC = () => {
  const {
    activeEvent,
    categories,
    updateCategory,
    lockCategoryPayment,
    finalizeVendorForCategory,
    unfinalizeVendorForCategory,
    vendorQuotes,
    createGuestProposal,
    addVendorQuote,
    showToast,
  } = useApp();
  const { user } = useAuth();

  const eventCategories = categories.filter((c) => c.eventId === activeEvent.id);
  const totalAllocated = eventCategories.reduce((acc, c) => acc + c.allocated, 0);
  const totalPaid = eventCategories.reduce((acc, c) => acc + (c.paid || 0), 0);
  const totalCommitted = eventCategories.reduce((acc, c) => acc + (c.committed || 0), 0);
  const lockedAdvanceCount = eventCategories.filter((c) => c.isPaidLocked && (c.paid || 0) > 0).length;
  const totalPendingBalance = Math.max(0, totalAllocated - totalPaid);

  const contingencyCategory = eventCategories.find(
    (c) => c.isContingency || c.name.toLowerCase().includes('contingency')
  );
  const reserveAmount = contingencyCategory ? contingencyCategory.allocated : 0;

  // Expanded row state for category drilldowns
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('cat-catering');

  // Payment / Advance Lock Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<any>(null);
  const [paymentInputAmount, setPaymentInputAmount] = useState<number>(0);
  const [paymentLockToggle, setPaymentLockToggle] = useState<boolean>(true);
  const [paymentNote, setPaymentNote] = useState<string>('');

  const openPaymentModal = (cat: any) => {
    setSelectedPaymentCategory(cat);
    setPaymentInputAmount(cat.paid || 0);
    setPaymentLockToggle(cat.isPaidLocked ?? true);
    setPaymentNote(cat.advanceNotes || '');
    setPaymentModalOpen(true);
  };

  const getQuotesForCategory = (catName: string) => {
    const cn = catName.toLowerCase();
    return vendorQuotes.filter((q) => {
      const qn = q.category.toLowerCase();
      return (
        cn === qn ||
        cn.includes(qn) ||
        qn.includes(cn) ||
        (cn.includes('photo') && qn.includes('photo')) ||
        (cn.includes('cater') && qn.includes('cater'))
      );
    });
  };

  // Interactive Catering Scenario Sliders (Local Simulation State)
  const [scenarioGuests, setScenarioGuests] = useState<number>(activeEvent.guestCount || 50);
  const [scenarioRate, setScenarioRate] = useState<number>(activeEvent.cateringModel?.sampleRatePerPlate || 900);
  const [scenarioExtras, setScenarioExtras] = useState<number>(activeEvent.cateringModel?.sampleExtras || 20000);

  // Synchronize scenario state whenever activeEvent changes
  useEffect(() => {
    const baseGuests = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
    const baseRate =
      activeEvent.cateringModel?.sampleRatePerPlate ||
      Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, baseGuests));
    const baseExtras = activeEvent.cateringModel?.sampleExtras ?? Math.round(activeEvent.totalBudget * 0.02);

    setScenarioGuests(baseGuests);
    setScenarioRate(baseRate);
    setScenarioExtras(baseExtras);
  }, [activeEvent.id, activeEvent.guestCount, activeEvent.totalBudget, activeEvent.type]);

  // Stress test mode: 0 (Baseline), 10 (+10%), 20 (+20%)
  const [stressMode, setStressMode] = useState<0 | 10 | 20>(0);

  // Gemini AI Advisory State
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState<boolean>(false);
  const [advisoryNotice, setAdvisoryNotice] = useState<string | null>(null);

  // Add Vendor Quote Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState<boolean>(false);
  const [newQuoteData, setNewQuoteData] = useState({
    vendorName: '',
    category: 'Catering',
    city: activeEvent.city || 'Jaipur',
    rating: 4.8,
    chargeBasis: 'per_plate',
    rate: 950,
    quantity: 200,
    taxes: 0,
    extras: 15000,
    inclusions: 'Buffet service, live pasta counter, cutlery & servers',
    exclusions: 'Midnight snacks, bar counter',
    validityDate: '2026-12-31',
  });

  // Calculate deterministic catering estimate via domain engine
  const effectivePlateRate =
    stressMode > 0 ? Math.round(scenarioRate * (1 + stressMode / 100)) : scenarioRate;

  const cateringResult = BudgetEngine.estimateCatering({
    guestCount: scenarioGuests,
    perPlateRate: effectivePlateRate,
    extraCounters: scenarioExtras,
  });

  const currentCateringCat = eventCategories.find((c) => c.name.toLowerCase().includes('catering'));
  const currentCateringAllocated = currentCateringCat ? currentCateringCat.allocated : 200000;
  const cateringDelta = cateringResult.totalCostINR - currentCateringAllocated;

  // Validation
  const validation = BudgetEngine.validateAllocations(eventCategories, activeEvent.totalBudget);

  const handleLaunchProposal = () => {
    createGuestProposal(scenarioGuests);
  };

  const handleRequestAdvisory = async () => {
    setLoadingAdvisory(true);
    setAdvisoryNotice(null);
    try {
      const token = user ? await user.getIdToken().catch(() => undefined) : undefined;
      const res = await budgetIntelligenceClient.getAdvisory(
        activeEvent,
        eventCategories,
        {
          guestCount: scenarioGuests,
          stressPercentage: stressMode,
          plateRate: scenarioRate,
          extras: scenarioExtras,
          useReserveToCoverOverrun: true,
        },
        token
      );
      setAiExplanation(res.explanation);
      if (res.notice) {
        setAdvisoryNotice(res.notice);
      }
    } catch (err: any) {
      showToast('Could not fetch AI budget advisory: ' + err.message, 'error');
    } finally {
      setLoadingAdvisory(false);
    }
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteData.vendorName.trim()) {
      showToast('Please enter a vendor name.', 'warning');
      return;
    }

    try {
      await addVendorQuote({
        vendorName: newQuoteData.vendorName,
        category: newQuoteData.category,
        city: newQuoteData.city,
        rating: newQuoteData.rating,
        chargeBasis: newQuoteData.chargeBasis,
        rate: Number(newQuoteData.rate),
        quantity: Number(newQuoteData.quantity),
        taxes: Number(newQuoteData.taxes),
        extras: Number(newQuoteData.extras),
        inclusions: newQuoteData.inclusions.split(',').map((s) => s.trim()),
        exclusions: newQuoteData.exclusions.split(',').map((s) => s.trim()),
        validityDate: newQuoteData.validityDate,
        status: 'review',
        sourceLabel: 'USER_ENTERED_QUOTE - User quote, not verified',
        notes: 'Manually logged quote. Quote never automatically alters approved budget allocations.',
      });
      setQuoteModalOpen(false);
      showToast(`Logged quote from "${newQuoteData.vendorName}". Tagged as USER_QUOTE (unverified).`, 'success');
    } catch (err: any) {
      showToast('Could not save quote: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Phase 4 Budget Governance Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Evidence-Aware Budget Intelligence</span>
            <span className="text-[#231530]/40">·</span>
            <span className="text-[#231530]/60">Strict {formatINR(activeEvent.totalBudget)} Allocation Cap</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Budget Studio & Cost Modelling
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuoteModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#231530]/15 hover:border-[#E06D28] text-xs font-semibold text-[#231530] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E06D28]" />
            <span>Add Vendor Quotation</span>
          </button>

          <div className="text-right">
            <div className="text-[11px] text-[#231530]/60">Total Budget</div>
            <div className="text-lg font-bold font-mono text-[#231530]">
              {formatINR(activeEvent.totalBudget)}
            </div>
          </div>
          <div className="h-8 w-px bg-[#231530]/10" />
          <div className="text-right">
            <div className="text-[11px] text-emerald-800 font-medium flex items-center justify-end gap-1">
              {lockedAdvanceCount > 0 && <Lock className="w-2.5 h-2.5 text-emerald-600" />}
              <span>Paid &amp; Advance</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-800">
              {formatINR(totalPaid)}
            </div>
          </div>
          <div className="h-8 w-px bg-[#231530]/10" />
          <div className="text-right">
            <div className="text-[11px] text-[#231530]/60">Balance Due</div>
            <div className="text-lg font-bold font-mono text-[#231530]/80">
              {formatINR(totalPendingBalance)}
            </div>
          </div>
          <div className="h-8 w-px bg-[#231530]/10" />
          <div className="text-right">
            <div className="text-[11px] text-amber-800 font-medium">Contingency</div>
            <div className="text-lg font-bold font-mono text-amber-900">
              {formatINR(reserveAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Visualizer Strip (Bar Allocation Distribution) */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#231530]">
              Category Allocation Distribution (Total: {formatINR(totalAllocated)})
            </span>
            {validation.isValid ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>100% Balanced (Exact {formatINR(activeEvent.totalBudget)})</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                Unbalanced by {formatINR(validation.differenceINR)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#231530]/70">
            <span>{eventCategories.length} Categories</span>
            <span className="text-[#231530]/40">·</span>
            <span className="font-mono text-[11px]">Paise-precise integer math</span>
          </div>
        </div>

        {/* Proportional horizontal bar */}
        <div className="w-full h-5 rounded-lg overflow-hidden flex bg-neutral-100">
          {eventCategories.map((cat) => {
            const percent = (cat.allocated / activeEvent.totalBudget) * 100;
            return (
              <div
                key={cat.id}
                style={{ width: `${percent}%`, backgroundColor: cat.color }}
                className="h-full hover:opacity-90 transition-opacity relative group cursor-pointer"
                title={`${cat.name}: ${formatINR(cat.allocated)} (${percent.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] pt-1">
          {eventCategories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-[#231530]/80 font-medium">{cat.name}:</span>
              <span className="font-mono text-[#231530] font-semibold">{formatINRCompact(cat.allocated)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Scenario Simulator Card (Catering & Sensitivity) */}
      <div className="bg-radial from-[#FAF7F2] via-white to-[#FAF7F2] border-2 border-[#E06D28]/30 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#E06D28]" />
              <h3 className="font-bold text-[#231530] font-display text-lg">
                Catering & Sensitivity Simulator
              </h3>
              <span className="text-[10px] uppercase font-semibold bg-[#E06D28]/10 text-[#E06D28] px-2 py-0.5 rounded-md">
                Deterministic Engine
              </span>
            </div>
            <p className="text-xs text-[#231530]/70 max-w-xl">
              Model guest changes, plate rates, and live counters. All calculations use exact integer paise arithmetic without rounding drift.
            </p>
          </div>

          <div className="p-4 bg-white border border-[#231530]/10 rounded-xl text-right min-w-[220px]">
            <div className="text-[11px] text-[#231530]/60">Simulated Catering Cost</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#E06D28]">
              {formatINR(cateringResult.totalCostINR)}
            </div>
            <div className="text-xs font-medium pt-1">
              {cateringDelta > 0 ? (
                <span className="text-amber-700">+{formatINR(cateringDelta)} over baseline</span>
              ) : cateringDelta < 0 ? (
                <span className="text-emerald-700">{formatINR(cateringDelta)} under baseline</span>
              ) : (
                <span className="text-[#231530]/50">Matches baseline {formatINR(currentCateringAllocated)}</span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Interactive Sliders (Fully Dynamic to activeEvent) */}
        {(() => {
          const baseGuests = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
          const minSliderGuests = Math.max(5, Math.round(baseGuests * 0.4));
          const maxSliderGuests = Math.max(baseGuests + 50, Math.round(baseGuests * 2.2));
          const stepGuests = baseGuests > 100 ? 10 : 5;
          const targetSimGuests = Math.round(baseGuests * 1.25);
          const simDeltaCost = (targetSimGuests - baseGuests) * effectivePlateRate;

          const baseRate =
            activeEvent.cateringModel?.sampleRatePerPlate ||
            Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, baseGuests));
          const minRate = Math.max(150, Math.round(baseRate * 0.5));
          const maxRate = Math.round(baseRate * 2);

          const baseExtras = activeEvent.cateringModel?.sampleExtras ?? Math.round(activeEvent.totalBudget * 0.02);
          const maxExtras = Math.max(30000, Math.round(baseExtras * 3));

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Slider 1: Guest Count */}
              <div className="p-4 bg-white border border-[#231530]/10 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#231530]">Chargeable Plates (Guests)</span>
                  <span className="font-mono font-bold text-[#E06D28]">{scenarioGuests} guests</span>
                </div>
                <input
                  type="range"
                  min={minSliderGuests}
                  max={maxSliderGuests}
                  step={stepGuests}
                  value={scenarioGuests}
                  onChange={(e) => setScenarioGuests(Number(e.target.value))}
                  className="w-full accent-[#E06D28] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#231530]/50">
                  <span>{minSliderGuests}</span>
                  <span className="font-semibold">Baseline {baseGuests}</span>
                  <span className="font-bold text-[#E06D28]">
                    {targetSimGuests} (+{formatINRCompact(simDeltaCost)})
                  </span>
                  <span>{maxSliderGuests}</span>
                </div>
              </div>

              {/* Slider 2: Rate Per Plate */}
              <div className="p-4 bg-white border border-[#231530]/10 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#231530]">Rate Per Plate</span>
                  <span className="font-mono font-bold text-[#E06D28]">₹{scenarioRate}/plate</span>
                </div>
                <input
                  type="range"
                  min={minRate}
                  max={maxRate}
                  step={25}
                  value={scenarioRate}
                  onChange={(e) => setScenarioRate(Number(e.target.value))}
                  className="w-full accent-[#E06D28] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#231530]/50">
                  <span>₹{minRate}</span>
                  <span className="font-semibold">₹{baseRate} (Baseline)</span>
                  <span>₹{maxRate}</span>
                </div>
              </div>

              {/* Slider 3: Live Extras */}
              <div className="p-4 bg-white border border-[#231530]/10 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#231530]">Live Stations &amp; Extras</span>
                  <span className="font-mono font-bold text-[#E06D28]">{formatINR(scenarioExtras)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxExtras}
                  step={Math.max(1000, Math.round(maxExtras / 10))}
                  value={scenarioExtras}
                  onChange={(e) => setScenarioExtras(Number(e.target.value))}
                  className="w-full accent-[#E06D28] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#231530]/50">
                  <span>₹0</span>
                  <span className="font-semibold">{formatINRCompact(baseExtras)} (Baseline)</span>
                  <span>{formatINRCompact(maxExtras)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hypothetical Stress Testing Controls */}
        <div className="p-4 bg-white rounded-xl border border-[#231530]/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
                Hypothetical Market Stress Scenarios
              </span>
              <p className="text-[11px] text-[#231530]/60">
                These are scenario assumptions, not commodity forecasts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStressMode(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  stressMode === 0
                    ? 'bg-[#231530] text-white'
                    : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
                }`}
              >
                Normal (0%)
              </button>
              <button
                type="button"
                onClick={() => setStressMode(10)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  stressMode === 10
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                +10% Inflation Stress
              </button>
              <button
                type="button"
                onClick={() => setStressMode(20)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  stressMode === 20
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                +20% High Demand Peak
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls & AI Advisory Trigger */}
        <div className="pt-2 border-t border-[#231530]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="text-[#231530]/70 font-mono text-[11px]">
            Formula: {scenarioGuests} plates × ₹{effectivePlateRate} + {formatINR(scenarioExtras)} extras ={' '}
            <strong className="text-[#231530]">{formatINR(cateringResult.totalCostINR)}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setScenarioGuests(activeEvent.guestCount);
                setScenarioRate(activeEvent.cateringModel.sampleRatePerPlate || 900);
                setScenarioExtras(activeEvent.cateringModel.sampleExtras || 20000);
                setStressMode(0);
              }}
              className="px-3 py-2 text-xs text-[#231530]/60 hover:text-[#231530] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRequestAdvisory}
              disabled={loadingAdvisory}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{loadingAdvisory ? 'Analyzing Tradeoffs...' : 'Ask AI Strategist'}</span>
            </button>

            <button
              onClick={handleLaunchProposal}
              className="px-5 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review Before/After Reallocation</span>
            </button>
          </div>
        </div>

        {/* AI Advisory Grounded Response Drawer */}
        {aiExplanation && (
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-950 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
              <span className="font-bold flex items-center gap-1.5 text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                Gemini Advisory (Grounded in getBudgetAnalysis Tool)
              </span>
              <button
                onClick={() => setAiExplanation(null)}
                className="text-indigo-700 hover:text-indigo-950 text-[11px] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="whitespace-pre-line leading-relaxed text-[#231530]">
              {aiExplanation}
            </div>
            {advisoryNotice && (
              <div className="text-[10px] text-indigo-800/80 italic pt-1 border-t border-indigo-200/40">
                {advisoryNotice}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accessible Category Table with Evidence Provenance */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#231530]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[#231530] font-display text-base">
              Detailed Category Breakdown & Evidence Provenance
            </h3>
            <p className="text-xs text-[#231530]/60 mt-0.5">
              Estimate vs Allocated vs Committed vs Paid with cost provenance
            </p>
          </div>
          <span className="text-xs text-[#231530]/50 font-mono">
            Click row to view Inclusions, Exclusions & Quality Checks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#231530]/70 font-semibold border-b border-[#231530]/10">
              <tr>
                <th className="p-4">Category</th>
                <th className="p-4">Evidence Provenance</th>
                <th className="p-4">Final Vendor</th>
                <th className="p-4 text-right">Estimate Range</th>
                <th className="p-4 text-right">Allocated</th>
                <th className="p-4 text-right">Committed</th>
                <th className="p-4 text-right">Paid &amp; Advance</th>
                <th className="p-4 text-center">Inclusions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#231530]/5">
              {eventCategories.map((cat) => {
                const isExpanded = expandedCategoryId === cat.id;
                const matchingQuotes = getQuotesForCategory(cat.name);
                const finalizedQuote =
                  matchingQuotes.find((q) => q.status === 'finalized') ||
                  (cat.selectedVendorId ? vendorQuotes.find((q) => q.id === cat.selectedVendorId) : null);
                const isFinalized = Boolean(cat.selectedVendorName || finalizedQuote);
                const finalVendorName = cat.selectedVendorName || finalizedQuote?.vendorName;
                const isQuoted = !isFinalized && (matchingQuotes.length > 0 || cat.sourceType === 'quoted');
                const isVerified = !isFinalized && !isQuoted && cat.sourceType === 'verified';

                return (
                  <React.Fragment key={cat.id}>
                    <tr
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      className={`hover:bg-[#FAF7F2]/60 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-[#FAF7F2]/40' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-[#231530]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="font-semibold">{cat.name}</span>
                          {cat.isContingency && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-sm font-semibold">
                              Reserve
                            </span>
                          )}
                        </div>
                        {cat.advanceNotes && (
                          <div className="text-[10px] text-[#231530]/50 font-normal italic pl-4.5 mt-0.5 truncate max-w-[160px]">
                            {cat.advanceNotes}
                          </div>
                        )}
                      </td>

                      {/* Evidence Provenance Column */}
                      <td className="p-4">
                        {isFinalized ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-tight">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>CONTRACT FINALIZED</span>
                            </span>
                            <div className="text-[10px] text-emerald-700 font-medium truncate max-w-[140px]">
                              {finalVendorName}
                            </div>
                          </div>
                        ) : isQuoted ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 uppercase tracking-tight">
                              <span>VENDOR QUOTED ({matchingQuotes.length})</span>
                            </span>
                            <div className="text-[10px] text-sky-700/80">
                              {matchingQuotes.length} quote{matchingQuotes.length > 1 ? 's' : ''} available
                            </div>
                          </div>
                        ) : isVerified ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 uppercase tracking-tight">
                              <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>VERIFIED OFFER</span>
                            </span>
                            <div className="text-[10px] text-teal-700/80">Verified market quote</div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-tight">
                              <span>BUDGET ESTIMATE</span>
                            </span>
                            <div className="text-[10px] text-[#231530]/50">Market baseline estimate</div>
                          </div>
                        )}
                      </td>

                      {/* Final Vendor Selection Column */}
                      <td className="p-4">
                        {isFinalized ? (
                          <div className="inline-flex items-center justify-between gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg max-w-[180px]">
                            <div className="flex items-center gap-1 min-w-0">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-emerald-950 text-xs truncate" title={finalVendorName}>
                                {finalVendorName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                unfinalizeVendorForCategory(cat.id);
                              }}
                              className="text-neutral-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                              title="Remove vendor selection"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : matchingQuotes.length > 0 ? (
                          <select
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.value) {
                                finalizeVendorForCategory(e.target.value, cat.id);
                              }
                            }}
                            defaultValue=""
                            className="text-xs px-2 py-1 bg-white border border-[#231530]/20 hover:border-[#E06D28] rounded-lg text-[#231530] font-medium cursor-pointer focus:outline-hidden"
                          >
                            <option value="" disabled>+ Finalize Vendor ({matchingQuotes.length})</option>
                            {matchingQuotes.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.vendorName} ({formatINRCompact(q.totalCalculated)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewQuoteData((prev) => ({ ...prev, category: cat.name }));
                              setQuoteModalOpen(true);
                            }}
                            className="text-[11px] text-[#231530]/50 hover:text-[#E06D28] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-[#E06D28]" />
                            <span>Add Quote</span>
                          </button>
                        )}
                      </td>

                      {/* Estimate Range */}
                      <td className="p-4 text-right font-mono tabular-nums text-[#231530]/70">
                        {formatINRCompact(cat.estimatedLow)} – {formatINRCompact(cat.estimatedHigh)}
                      </td>

                      {/* Allocated */}
                      <td className="p-4 text-right font-mono tabular-nums font-bold text-[#231530]">
                        {formatINR(cat.allocated)}
                      </td>

                      {/* Committed */}
                      <td className="p-4 text-right font-mono tabular-nums text-[#231530]/80">
                        {formatINR(cat.committed)}
                      </td>

                      {/* Paid & Advance Column (With Lock Indicator) */}
                      <td className="p-4 text-right">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentModal(cat);
                          }}
                          className="group/paid inline-flex flex-col items-end cursor-pointer p-1.5 rounded-lg hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition-colors"
                          title="Click to Record or Lock Advance Payment"
                        >
                          <div className="flex items-center gap-1.5">
                            {cat.isPaidLocked ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Locked</span>
                              </span>
                            ) : cat.paid > 0 ? (
                              <span className="text-[9px] text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                Unlocked
                              </span>
                            ) : null}
                            <span className="font-mono tabular-nums font-bold text-emerald-700 text-xs">
                              {formatINR(cat.paid)}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#231530]/50 group-hover/paid:text-[#E06D28] group-hover/paid:underline mt-0.5">
                            {cat.isPaidLocked ? 'Locked Advance' : cat.paid > 0 ? 'Lock Advance' : '+ Record Advance'}
                          </span>
                        </div>
                      </td>

                      {/* Inclusions Chevron */}
                      <td className="p-4 text-center text-[#231530]/50">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 mx-auto" />
                        )}
                      </td>
                    </tr>

                    {/* Drilldown Row */}
                    {isExpanded && (
                      <tr className="bg-[#FAF7F2]/80">
                        <td colSpan={8} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            {/* Inclusions & Exclusions */}
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className="font-semibold text-emerald-800 uppercase tracking-wider text-[11px]">
                                  Included in this Estimate:
                                </span>
                                <ul className="space-y-1 text-[#231530]/80">
                                  {cat.inclusions.map((inc, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      <span>{inc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="space-y-2">
                                <span className="font-semibold text-rose-800 uppercase tracking-wider text-[11px]">
                                  Explicitly Excluded (Review for Surcharges):
                                </span>
                                <ul className="space-y-1 text-[#231530]/80">
                                  {cat.exclusions.map((exc, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                      <span>{exc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Advance Payment & Financial Lock Card */}
                            <div className="p-4 bg-white rounded-xl border border-[#231530]/10 space-y-3">
                              <div className="flex items-center justify-between border-b border-[#231530]/10 pb-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-[#231530] flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-[#E06D28]" />
                                  <span>Payment &amp; Advance Lock</span>
                                </span>
                                {cat.isPaidLocked ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-emerald-600" />
                                    <span>Locked Advance</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                    Unlocked (Draft)
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex justify-between text-[#231530]/70">
                                  <span>Allocated:</span>
                                  <span className="font-semibold text-[#231530]">{formatINR(cat.allocated)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700">
                                  <span>Advance Paid:</span>
                                  <span className="font-bold">{formatINR(cat.paid)}</span>
                                </div>
                                <div className="flex justify-between text-rose-700 pt-1 border-t border-[#231530]/5">
                                  <span>Balance Due:</span>
                                  <span className="font-bold">{formatINR(Math.max(0, cat.allocated - cat.paid))}</span>
                                </div>
                              </div>

                              {cat.advanceNotes && (
                                <p className="text-[11px] text-[#231530]/65 italic bg-[#FAF7F2] p-2 rounded-lg border border-[#231530]/5">
                                  "{cat.advanceNotes}"
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={() => openPaymentModal(cat)}
                                className="w-full py-2 bg-[#FAF7F2] hover:bg-emerald-50 text-xs font-semibold text-[#231530] hover:text-emerald-900 border border-[#231530]/15 hover:border-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {cat.isPaidLocked ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Manage / Unlock Payment</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 text-[#E06D28]" />
                                    <span>Record &amp; Lock Advance</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Vendor Procurement & Provenance Checks */}
                            <div className="p-4 bg-white rounded-xl border border-[#231530]/10 space-y-3">
                              <div className="flex items-center justify-between border-b border-[#231530]/10 pb-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-[#231530]">
                                  Vendor Procurement Status
                                </span>
                                {isFinalized ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Final Vendor Assigned
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                                    Pending Selection
                                  </span>
                                )}
                              </div>

                              {isFinalized ? (
                                <div className="space-y-2">
                                  <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-1">
                                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{finalVendorName}</span>
                                    </div>
                                    <div className="text-[11px] text-emerald-800 flex justify-between">
                                      <span>Contract Package:</span>
                                      <span className="font-mono font-bold">{formatINR(cat.committed)}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => unfinalizeVendorForCategory(cat.id)}
                                    className="w-full py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Remove Final Vendor Selection
                                  </button>
                                </div>
                              ) : matchingQuotes.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-[11px] text-[#231530]/70 font-medium">
                                    {matchingQuotes.length} Vendor Quotation{matchingQuotes.length > 1 ? 's' : ''} available:
                                  </div>
                                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                    {matchingQuotes.map((q) => (
                                      <div
                                        key={q.id}
                                        className="p-2 bg-[#FAF7F2] rounded-lg border border-[#231530]/10 flex items-center justify-between text-xs"
                                      >
                                        <div>
                                          <div className="font-semibold text-[#231530]">{q.vendorName}</div>
                                          <div className="text-[10px] text-[#231530]/60 font-mono">
                                            {formatINR(q.totalCalculated)}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => finalizeVendorForCategory(q.id, cat.id)}
                                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-xs font-semibold text-[#231530] hover:text-emerald-900 border border-[#231530]/15 hover:border-emerald-400 rounded-md transition-colors cursor-pointer"
                                        >
                                          Select as Final
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#231530]/5 text-center space-y-1">
                                  <div className="text-[#231530]/60 text-xs">No vendor quotes recorded for {cat.name} yet.</div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewQuoteData((prev) => ({ ...prev, category: cat.name }));
                                      setQuoteModalOpen(true);
                                    }}
                                    className="text-xs text-[#E06D28] font-semibold hover:underline"
                                  >
                                    + Add quotation now
                                  </button>
                                </div>
                              )}

                              <div className="pt-2 border-t border-[#231530]/10 text-[10px] text-emerald-700 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Anti-double-count verified (No overlapping bundled fees)</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Quote Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#231530]/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#231530]/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#E06D28]">
                  USER_QUOTE Entry Flow
                </span>
                <h3 className="text-lg font-bold text-[#231530] font-display">
                  Add Vendor Quotation
                </h3>
              </div>
              <button
                onClick={() => setQuoteModalOpen(false)}
                className="p-1.5 text-[#231530]/60 hover:text-[#231530] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Manually added quotes are classified strictly as <code>USER_QUOTE</code> (not verified live vendor offers). A new quote does <em>not</em> automatically change approved event allocations.
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#231530] mb-1">Vendor / Firm Name</label>
                <input
                  type="text"
                  required
                  value={newQuoteData.vendorName}
                  onChange={(e) => setNewQuoteData({ ...newQuoteData, vendorName: e.target.value })}
                  placeholder="e.g. Royal Marwar Caterers, Johari Bazaar"
                  className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">Category</label>
                  <select
                    value={newQuoteData.category}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  >
                    <option value="Catering">Catering</option>
                    <option value="Venue">Venue</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Transport">Transport</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">City / Region</label>
                  <input
                    type="text"
                    value={newQuoteData.city}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">Base Rate (INR)</label>
                  <input
                    type="number"
                    value={newQuoteData.rate}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, rate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">Quantity / Plates</label>
                  <input
                    type="number"
                    value={newQuoteData.quantity}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">Live Extras (INR)</label>
                  <input
                    type="number"
                    value={newQuoteData.extras}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, extras: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#231530] mb-1">Taxes / GST (INR)</label>
                  <input
                    type="number"
                    value={newQuoteData.taxes}
                    onChange={(e) => setNewQuoteData({ ...newQuoteData, taxes: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#231530] mb-1">Package Inclusions</label>
                <input
                  type="text"
                  value={newQuoteData.inclusions}
                  onChange={(e) => setNewQuoteData({ ...newQuoteData, inclusions: e.target.value })}
                  placeholder="Comma separated inclusions"
                  className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(false)}
                  className="px-4 py-2 border border-[#231530]/15 rounded-lg text-[#231530]/70 hover:text-[#231530] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E06D28] text-white font-semibold rounded-lg hover:bg-[#C4551D] shadow-xs cursor-pointer"
                >
                  Record Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record & Lock Advance Payment Modal */}
      {paymentModalOpen && selectedPaymentCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#231530]/10 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#231530]/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#E06D28]">
                  Financial Accounting &amp; Ledger
                </span>
                <h3 className="text-lg font-bold text-[#231530] font-display flex items-center gap-2">
                  <span>Advance Payment: {selectedPaymentCategory.name}</span>
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 text-[#231530]/60 hover:text-[#231530] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Box */}
            <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#231530]/10 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[11px] text-[#231530]/60">Total Allocated</div>
                <div className="text-base font-bold font-mono text-[#231530]">
                  {formatINR(selectedPaymentCategory.allocated)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#231530]/60">Remaining Balance</div>
                <div className="text-base font-bold font-mono text-amber-900">
                  {formatINR(Math.max(0, selectedPaymentCategory.allocated - paymentInputAmount))}
                </div>
              </div>
            </div>

            {/* Paid Amount Input */}
            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-[#231530]">
                Advance Amount Paid (INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-[#231530]/50">₹</span>
                <input
                  type="number"
                  min={0}
                  max={selectedPaymentCategory.allocated * 2}
                  value={paymentInputAmount}
                  onChange={(e) => setPaymentInputAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-2 border border-[#231530]/15 rounded-lg font-mono text-base font-bold focus:border-[#E06D28] focus:outline-hidden"
                />
              </div>

              {/* Quick Percentage Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-[#231530]/50">Presets:</span>
                {[0.2, 0.25, 0.3, 0.5, 1.0].map((pct) => {
                  const val = Math.round(selectedPaymentCategory.allocated * pct);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPaymentInputAmount(val)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-neutral-100 border border-[#231530]/15 text-[10px] font-semibold text-[#231530]/80 cursor-pointer"
                    >
                      {pct * 100}% ({formatINRCompact(val)})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Note / Transaction ID */}
            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-[#231530]">
                Payment Reference / Note (Optional)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. ₹30,000 advance token paid via RTGS/UPI on 2 Nov"
                className="w-full px-3 py-2 border border-[#231530]/15 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
              />
            </div>

            {/* Lock Paid Amount Toggle */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentLockToggle}
                  onChange={(e) => setPaymentLockToggle(e.target.checked)}
                  className="mt-0.5 accent-emerald-600 rounded cursor-pointer w-4 h-4"
                />
                <div>
                  <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Lock this Paid Amount into Financial Accounting</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed mt-0.5">
                    Locking guarantees this advance is recognized as non-refundable paid money. The allocated category budget cannot be reduced below the locked advance amount.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              {selectedPaymentCategory.isPaidLocked ? (
                <button
                  type="button"
                  onClick={async () => {
                    await lockCategoryPayment(selectedPaymentCategory.id, paymentInputAmount, false, paymentNote);
                    setPaymentModalOpen(false);
                  }}
                  className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Amount</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 border border-[#231530]/15 rounded-lg text-xs text-[#231530]/70 hover:text-[#231530] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await lockCategoryPayment(selectedPaymentCategory.id, paymentInputAmount, paymentLockToggle, paymentNote);
                    setPaymentModalOpen(false);
                  }}
                  className="px-5 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {paymentLockToggle ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Save &amp; Lock Advance</span>
                    </>
                  ) : (
                    <span>Save Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
