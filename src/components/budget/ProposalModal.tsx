import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/currency';
import {
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  Lock,
  Layers,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';

export const ProposalModal: React.FC = () => {
  const { activeProposalModal, setActiveProposalModal, approveProposal, rejectProposal, activeEvent } = useApp();

  const proposal = activeProposalModal;

  // Track alternative selected
  const [chosenAlternative, setChosenAlternative] = useState<string>(
    proposal?.chosenAlternativeId || 'alt-reserve'
  );

  // Track selected tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (proposal?.taskModifications) {
      proposal.taskModifications.forEach((t) => {
        initial[t.id] = t.selected !== false;
      });
    }
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!proposal) return null;

  const {
    id,
    title,
    baseVersion = 1,
    impactSummary,
    taskModifications = [],
    alternatives = [],
    warnings = [],
    applied,
  } = proposal;

  const {
    originalGuestCount,
    revisedGuestCount,
    originalCateringCost,
    revisedCateringCost,
    difference,
    originalReserve,
    revisedReserve,
    totalBudget,
  } = impactSummary;

  const isExpand = chosenAlternative === 'alt-expand';
  const effectiveTotalBudget = isExpand ? totalBudget + difference : totalBudget;
  const effectiveReserve = isExpand ? originalReserve : revisedReserve;

  const deltaGuests = revisedGuestCount - originalGuestCount;
  const plateRate =
    activeEvent.cateringModel?.sampleRatePerPlate ||
    (deltaGuests > 0
      ? Math.round(difference / deltaGuests)
      : Math.round(originalCateringCost / Math.max(1, originalGuestCount)));
  const extras = activeEvent.cateringModel?.sampleExtras || 0;

  const toggleTask = (taskId: string) => {
    if (applied) return;
    setSelectedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const activeSelectedIds = Object.keys(selectedTaskIds).filter((k) => selectedTaskIds[k]);
      await approveProposal(id, {
        alternativeId: chosenAlternative,
        selectedTaskIds: activeSelectedIds,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#231530]/10 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#231530]/10 bg-[#FAF7F2] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#E06D28]">
                    AI Re-Planning Impact Analysis
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-800 border border-neutral-300">
                    Base v{baseVersion}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Idempotent Guard
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#231530] font-display mt-0.5">{title}</h3>
              </div>
            </div>
            <button
              onClick={() => setActiveProposalModal(null)}
              className="p-2 text-[#231530]/60 hover:text-[#231530] hover:bg-[#231530]/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[#231530]/70 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#E06D28] shrink-0" />
            <span>
              Approval-gated workflow: Preview makes NO data changes until you explicitly confirm below. Cancel/reject leaves data 100% unaltered.
            </span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Before vs After Comparative Table */}
          <div className="border border-[#231530]/10 rounded-xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-3 bg-[#FAF7F2] p-3 text-xs font-semibold text-[#231530]/70 border-b border-[#231530]/10">
              <span>Metric / Category</span>
              <span className="text-center">Current Baseline</span>
              <span className="text-right">Proposed Adjustment</span>
            </div>
            <div className="divide-y divide-[#231530]/5 text-sm">
              <div className="grid grid-cols-3 p-3 items-center">
                <span className="font-medium text-[#231530]">Guest Count</span>
                <span className="text-center font-mono tabular-nums text-[#231530]/70">
                  {originalGuestCount} guests
                </span>
                <div className="flex items-center justify-end gap-2 font-mono tabular-nums font-semibold text-[#E06D28]">
                  <span>{revisedGuestCount} guests</span>
                  <span className="text-xs font-normal text-emerald-600">
                    (+{revisedGuestCount - originalGuestCount})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-3 items-center">
                <div>
                  <span className="font-medium text-[#231530]">Catering Allocation</span>
                  <div className="text-[11px] text-[#231530]/50">
                    {revisedGuestCount} plates @ {formatINR(plateRate)}/plate
                    {extras > 0 ? ` + ${formatINR(extras)} extras` : ''}
                  </div>
                </div>
                <span className="text-center font-mono tabular-nums text-[#231530]/70">
                  {formatINR(originalCateringCost)}
                </span>
                <div className="flex items-center justify-end gap-1.5 font-mono tabular-nums font-semibold text-[#E06D28]">
                  <span>{formatINR(revisedCateringCost)}</span>
                  <span className="text-xs font-normal text-amber-700">
                    (+{formatINR(difference)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-3 items-center bg-amber-50/50">
                <div>
                  <span className="font-medium text-amber-900">Contingency Reserve</span>
                  <div className="text-[11px] text-amber-700/80">
                    {isExpand ? 'Preserved via budget expansion' : 'Absorbs overrun to preserve cap'}
                  </div>
                </div>
                <span className="text-center font-mono tabular-nums text-[#231530]/70">
                  {formatINR(originalReserve)}
                </span>
                <div className="flex items-center justify-end gap-1.5 font-mono tabular-nums font-semibold text-amber-800">
                  <span>{formatINR(effectiveReserve)}</span>
                  <span className="text-xs font-normal text-rose-600">
                    ({isExpand ? '₹0 change' : `-${formatINR(difference)}`})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-3 items-center bg-[#FAF7F2] font-semibold">
                <span className="text-[#231530]">Total Event Budget</span>
                <span className="text-center font-mono tabular-nums text-[#231530]">
                  {formatINR(totalBudget)}
                </span>
                <div className="flex items-center justify-end gap-1.5 font-mono tabular-nums font-bold">
                  <span className={isExpand ? 'text-amber-700' : 'text-emerald-700'}>
                    {formatINR(effectiveTotalBudget)}
                  </span>
                  <span
                    className={`text-[11px] font-normal uppercase px-2 py-0.5 rounded-sm ${
                      isExpand
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isExpand ? `+${formatINR(difference)} Expansion` : 'Preserved (0 Delta)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#231530]/70 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E06D28]" />
              Select Resolution Strategy:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A */}
              <div
                onClick={() => !applied && setChosenAlternative('alt-reserve')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  chosenAlternative === 'alt-reserve'
                    ? 'border-[#E06D28] bg-[#E06D28]/5 shadow-xs'
                    : 'border-[#231530]/10 bg-white hover:border-[#231530]/30'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      chosenAlternative === 'alt-reserve'
                        ? 'border-[#E06D28] bg-[#E06D28] text-white'
                        : 'border-neutral-400'
                    }`}
                  >
                    {chosenAlternative === 'alt-reserve' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-[#231530] flex items-center gap-1.5">
                      <span>Option A: Absorb Overrun from Reserve</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-sm">
                        Recommended
                      </span>
                    </div>
                    <div className="text-[#231530]/70 text-[11px] leading-relaxed">
                      Transfers {formatINR(difference)} from Contingency Reserve to Catering. Total budget stays strictly {formatINR(totalBudget)}. Reserve remains healthy at {formatINR(revisedReserve)}.
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B */}
              <div
                onClick={() => !applied && setChosenAlternative('alt-expand')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  chosenAlternative === 'alt-expand'
                    ? 'border-[#E06D28] bg-[#E06D28]/5 shadow-xs'
                    : 'border-[#231530]/10 bg-white hover:border-[#231530]/30'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      chosenAlternative === 'alt-expand'
                        ? 'border-[#E06D28] bg-[#E06D28] text-white'
                        : 'border-neutral-400'
                    }`}
                  >
                    {chosenAlternative === 'alt-expand' && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-[#231530]">
                      Option B: Expand Total Budget Ceiling
                    </div>
                    <div className="text-[#231530]/70 text-[11px] leading-relaxed">
                      Expands total celebration budget to {formatINR(totalBudget + difference)} to keep the full {formatINR(originalReserve)} contingency cushion intact.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Vendor Governance &amp; Immutability Guard:</div>
              <div className="text-[11px] leading-relaxed text-amber-800">
                AI re-planning does not automatically bind vendors or claim bookings are confirmed. Contractual quotes and venue physical capacities must be verified directly with suppliers.
              </div>
            </div>
          </div>

          {/* Synchronized Task Impact Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#231530]/70">
                Synchronized Impacted Tasks ({taskModifications.length} Suggestions):
              </h4>
              <span className="text-[11px] text-[#231530]/50">
                Select which checklist updates to apply
              </span>
            </div>

            <div className="border border-[#231530]/10 rounded-xl divide-y divide-[#231530]/5 max-h-56 overflow-y-auto bg-neutral-50/50">
              {taskModifications.length > 0 ? (
                taskModifications.map((task) => {
                  const isChecked = selectedTaskIds[task.id] !== false;
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-3 text-xs flex items-start gap-3 transition-colors cursor-pointer ${
                        isChecked ? 'bg-white' : 'bg-neutral-100/60 opacity-60'
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-[#E06D28] shrink-0 cursor-pointer"
                        disabled={applied}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-semibold ${
                              isChecked ? 'text-[#231530]' : 'text-[#231530]/50 line-through'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-neutral-200/60 text-[#231530]/70 shrink-0">
                            {task.categoryName}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#231530]/70">{task.reason}</div>
                        {task.vendorVerificationWarning && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 inline-flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{task.vendorVerificationWarning}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-xs text-[#231530]/60 text-center">
                  No direct task modifications required for this change.
                </div>
              )}
            </div>
          </div>

          {applied && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>This proposal was already approved and applied to your active celebration state.</span>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 px-6 border-t border-[#231530]/10 bg-[#FAF7F2] flex items-center justify-between rounded-b-2xl">
          <button
            onClick={() => {
              rejectProposal(id);
            }}
            disabled={applied}
            className="px-4 py-2 text-xs font-semibold text-[#231530]/70 hover:text-[#231530] hover:bg-neutral-200/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel / Reject (Zero Changes)
          </button>

          <button
            onClick={handleApprove}
            disabled={applied || isSubmitting}
            className={`px-5 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              applied
                ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                : 'bg-[#E06D28] text-white hover:bg-[#C4551D] shadow-sm'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {applied
                ? 'Already Applied'
                : isSubmitting
                ? 'Applying Reallocation...'
                : 'Approve & Apply Reallocation'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
