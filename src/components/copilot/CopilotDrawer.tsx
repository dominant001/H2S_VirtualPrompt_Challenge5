import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatINRCompact } from '../../utils/currency';
import { X, Send, Sparkles, ArrowRight, Check, AlertCircle } from 'lucide-react';

export const CopilotDrawer: React.FC = () => {
  const {
    copilotOpen,
    setCopilotOpen,
    copilotMessages,
    sendCopilotMessage,
    activeEvent,
    setActiveProposalModal,
    createGuestProposal,
  } = useApp();

  const [input, setInput] = useState('');

  const baseGuests = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
  const extraGuests = Math.max(5, Math.round(baseGuests * 0.25));
  const simTarget = baseGuests + extraGuests;
  const plateRate =
    activeEvent.cateringModel?.sampleRatePerPlate ||
    Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, baseGuests));
  const simDeltaINR = extraGuests * plateRate;

  if (!copilotOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendCopilotMessage(input);
    setInput('');
  };

  const handleQuickAction = (action: string) => {
    if (action.startsWith('increase_guests')) {
      sendCopilotMessage(`Increase guests from ${baseGuests} to ${simTarget}, keep ₹${formatINR(activeEvent.totalBudget)} budget`);
    } else if (action === 'check_invitations' || action === 'check_dependencies') {
      sendCopilotMessage(
        activeEvent.type === 'birthday'
          ? 'Check birthday party activity and cake dependencies'
          : 'Check invitation dependency sequence'
      );
    } else if (action === 'review_catering') {
      sendCopilotMessage('Review catering plate rate vs extra stations');
    } else if (action === 'open_proposal') {
      createGuestProposal(simTarget);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#FFFFFF] shadow-2xl border-l border-[#231530]/10 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 px-6 border-b border-[#231530]/10 bg-[#FAF7F2] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E06D28] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#231530] font-display text-base">Utsav AI Copilot</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                AI Gateway Active
              </span>
            </div>
            <div className="text-xs text-[#231530]/60">
              Context: {activeEvent.name} · {activeEvent.city}
            </div>
          </div>
        </div>
        <button
          onClick={() => setCopilotOpen(false)}
          className="p-2 text-[#231530]/60 hover:text-[#231530] hover:bg-[#231530]/5 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Gateway & Simulation Status Banner */}
      <div className="px-6 py-2 bg-[#FAF7F2] border-b border-[#231530]/10 text-[11px] text-[#231530]/80 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-[#E06D28] shrink-0" />
          <span>Gateway Quotas & Budget Guard Active</span>
        </span>
        <span className="text-[10px] font-mono font-semibold text-[#E06D28]">
          20 msgs/day quota
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {copilotMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-[#231530] text-white rounded-tr-none'
                  : 'bg-[#FAF7F2] text-[#231530] border border-[#231530]/10 rounded-tl-none shadow-xs'
              }`}
            >
              {msg.text}
            </div>

            {/* Quick action buttons if provided */}
            {msg.quickActions && msg.quickActions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                {msg.quickActions.map((qa, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(qa.action)}
                    className="text-xs font-medium px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E06D28]/10 text-[#231530] hover:text-[#E06D28] border border-[#231530]/15 rounded-lg transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{qa.label}</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* If message generated a change proposal */}
            {msg.proposal && (
              <div className="mt-3 w-full p-4 border border-[#E06D28]/30 bg-[#FAF7F2] rounded-xl text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#231530]">Generated Re-planning Proposal:</span>
                  <span className="text-[11px] font-mono text-[#E06D28] font-bold">
                    +{formatINR(msg.proposal.impactSummary.difference)} Catering
                  </span>
                </div>
                <div className="text-[#231530]/70 text-[11px]">
                  Reserve: {formatINR(msg.proposal.impactSummary.originalReserve)} →{' '}
                  <span className="font-semibold text-[#231530]">{formatINR(msg.proposal.impactSummary.revisedReserve)}</span>
                  {' '}· Total: {formatINR(msg.proposal.impactSummary.totalBudget)}
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => setActiveProposalModal(msg.proposal || null)}
                    className="w-full py-2 px-3 bg-[#E06D28] text-white rounded-lg font-semibold hover:bg-[#C4551D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Review & Approve Impact Preview</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-3 bg-[#FAF7F2] border-t border-[#231530]/10 flex items-center gap-2 overflow-x-auto text-xs whitespace-nowrap">
        <span className="text-[11px] font-semibold text-[#231530]/50 shrink-0">Try:</span>
        <button
          onClick={() =>
            sendCopilotMessage(`Increase guests from ${baseGuests} to ${simTarget}, keep ₹${formatINR(activeEvent.totalBudget)} budget`)
          }
          className="px-2.5 py-1 bg-white border border-[#231530]/10 rounded-md hover:border-[#E06D28] text-[#231530]/80 transition-colors text-[11px] cursor-pointer"
        >
          {baseGuests} → {simTarget} Guests (+{formatINRCompact(simDeltaINR)})
        </button>
        <button
          onClick={() =>
            sendCopilotMessage(
              activeEvent.type === 'birthday'
                ? 'Check birthday party activity and cake dependencies'
                : 'Check invitation dependency sequence'
            )
          }
          className="px-2.5 py-1 bg-white border border-[#231530]/10 rounded-md hover:border-[#E06D28] text-[#231530]/80 transition-colors text-[11px] cursor-pointer"
        >
          {activeEvent.type === 'birthday' ? 'Party milestones & cake' : 'Invitation dependencies'}
        </button>
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#231530]/10 bg-white flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask copilot or type 'Increase guests to ${simTarget}'...`}
          className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:outline-hidden focus:border-[#E06D28] focus:ring-1 focus:ring-[#E06D28] text-[#231530]"
        />
        <button
          type="submit"
          className="p-2.5 bg-[#E06D28] text-white rounded-xl hover:bg-[#C4551D] transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
