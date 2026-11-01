import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Layers,
  HeartHandshake,
  CheckCircle2,
  Users2,
  Building,
  Cake,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export const LandingScreen: React.FC = () => {
  const { setCurrentTab, setOnboardingOpen, setCopilotOpen, activeEvent } = useApp();

  return (
    <div className="space-y-16 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-radial from-[#3A2350] via-[#231530] to-[#160B20] text-white p-8 sm:p-12 lg:p-16 border border-white/10 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-[#E06D28]" />
            <span>AI Event Architect · Intelligent Multi-Event Planning</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight leading-[1.1] text-balance">
            You celebrate.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-[#E06D28]">
              We plan.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-2xl font-normal leading-relaxed">
            The intelligent, location-aware planning copilot for Indian weddings, milestone birthdays, and community festivals. Experience granular checklists, strict dependency tracking, and grounded budget re-planning.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="px-6 py-3.5 bg-[#E06D28] text-white font-semibold text-sm rounded-xl hover:bg-[#C4551D] transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <span>Open Dashboard ({activeEvent.name})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setOnboardingOpen(true)}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              Plan My Event (Wizard)
            </button>

            <button
              onClick={() => setCopilotOpen(true)}
              className="px-5 py-3.5 bg-black/40 hover:bg-black/60 text-amber-300 text-sm font-medium rounded-xl border border-amber-400/20 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ask Utsav AI</span>
            </button>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Balanced {formatINR(activeEvent.totalBudget)} Budget Cap
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {activeEvent.guestCount} Guests Dynamic Reallocation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Contextual {activeEvent.type.toUpperCase()} Milestones
            </span>
          </div>
        </div>

        {/* Decorative Golden Ambient Accent */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 3 Celebration Archetypes */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
              Specialized Template Packs
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
              Tailored for Every Indian Milestone
            </h2>
          </div>
          <p className="text-xs text-[#231530]/60 max-w-md">
            Each celebration template activates custom categories, hierarchical task dependencies, and domain-grounded budget models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Weddings */}
          <div className="p-6 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-4 hover:border-[#E06D28]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-700">Celebration Suite</span>
              <h3 className="text-lg font-bold text-[#231530] font-display">Indian Weddings</h3>
              <p className="text-xs text-[#231530]/70 mt-1 leading-relaxed">
                Multi-day logistics: Baraat vintage vehicle route, master tailor sherwani fittings, mandap marigolds, and complete 7-step invitation printing-to-RSVP chain.
              </p>
            </div>
            <div className="pt-2 border-t border-[#231530]/5 text-xs text-[#231530]/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Groom & Bride granular workflows</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Catering per-plate & extra station formulas</span>
              </div>
            </div>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="w-full mt-2 py-2.5 px-3 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white text-[#231530] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Open Celebration Dashboard
            </button>
          </div>

          {/* Card 2: Birthdays */}
          <div className="p-6 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-4 hover:border-[#E06D28]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-700">Theme & Games Pack</span>
              <h3 className="text-lg font-bold text-[#231530] font-display">Milestone Birthdays</h3>
              <p className="text-xs text-[#231530]/70 mt-1 leading-relaxed">
                Curate custom fondant themes, book emcee hosts for musical chairs, organize return gift hampers, and reserve kids entertainment.
              </p>
            </div>
            <div className="pt-2 border-t border-[#231530]/5 text-xs text-[#231530]/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Cake delivery & dessert counters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Return gifts & magician coordination</span>
              </div>
            </div>
            <button
              onClick={() => setOnboardingOpen(true)}
              className="w-full mt-2 py-2.5 px-3 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white text-[#231530] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Create Birthday Plan
            </button>
          </div>

          {/* Card 3: Community Events */}
          <div className="p-6 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-4 hover:border-[#E06D28]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-700">Civic & Festival Pack</span>
              <h3 className="text-lg font-bold text-[#231530] font-display">Community Festivals</h3>
              <p className="text-xs text-[#231530]/70 mt-1 leading-relaxed">
                Diwali Milan, Garba nights, and housing society assemblies. Police NOC permissions, volunteer shifts, crowd safety, and post-event cleanup.
              </p>
            </div>
            <div className="pt-2 border-t border-[#231530]/5 text-xs text-[#231530]/80 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Police NOC & Fire safety permits</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                <span>Volunteer rosters & AV line-array stage</span>
              </div>
            </div>
            <button
              onClick={() => setOnboardingOpen(true)}
              className="w-full mt-2 py-2.5 px-3 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white text-[#231530] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Create Community Plan
            </button>
          </div>
        </div>
      </section>

      {/* How Utsav AI Solves the Chaos */}
      <section className="p-8 sm:p-12 bg-white border border-[#231530]/10 rounded-3xl space-y-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            Built with Engineering Discipline
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display mt-1">
            Why Indian Families Trust Utsav AI
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center font-bold font-mono">
              01
            </div>
            <h4 className="font-semibold text-sm text-[#231530]">Never Invent Missing Dates</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              If an auspicious date is unconfirmed, milestones are calculated relative to event day (T-60, T-30, T-0), preserving reality without hallucination.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center font-bold font-mono">
              02
            </div>
            <h4 className="font-semibold text-sm text-[#231530]">Strict Contingency Reserve</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Every event reserves a 10–15% buffer. When guest counts increase, the system preserves your budget ceiling with before/after comparative approval.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center font-bold font-mono">
              03
            </div>
            <h4 className="font-semibold text-sm text-[#231530]">Hierarchical Dependencies</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Invitations cannot be distributed until proofing is signed off and printing completed. Blocked items alert family owners proactively.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center font-bold font-mono">
              04
            </div>
            <h4 className="font-semibold text-sm text-[#231530]">No Double-Counted Bundles</h4>
            <p className="text-xs text-[#231530]/70 leading-relaxed">
              Vendor quotes distinguish plate rates from extras and service taxes. If decor is included in venue rent, cost calculations won't duplicate it.
            </p>
          </div>
        </div>
      </section>

      {/* Active Workspace Banner */}
      <section className="p-8 bg-[#FAF7F2] border border-[#231530]/10 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            Active Celebration Workspace
          </span>
          <h3 className="text-xl font-bold text-[#231530] font-display">
            {activeEvent.name} · {activeEvent.city} ({formatINR(activeEvent.totalBudget)})
          </h3>
          <p className="text-xs text-[#231530]/70">
            {activeEvent.guestCount} guests · {activeEvent.type.toUpperCase()} · Full dynamic budget allocation with contingency protection.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('budget')}
          className="px-5 py-3 bg-[#231530] hover:bg-[#3A2350] text-white text-xs font-semibold rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <span>Open Budget Studio</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
