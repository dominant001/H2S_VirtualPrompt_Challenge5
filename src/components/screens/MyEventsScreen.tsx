import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatEventDate } from '../../utils/currency';
import {
  FolderKanban,
  Plus,
  Calendar,
  Users,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Cloud,
  LogIn,
} from 'lucide-react';

export const MyEventsScreen: React.FC = () => {
  const {
    events,
    activeEventId,
    setActiveEventId,
    setOnboardingOpen,
    setCurrentTab,
    categories,
    tasks,
    seedSampleEventToCloud,
    isSyncing,
  } = useApp();

  const { user, isDemoMode, signInWithGoogle } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Celebration Portfolio</span>
            <span className="text-[#231530]/40">·</span>
            <span>{user && !isDemoMode ? 'Cloud Firestore Account' : 'Active Local Workspace'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            My Celebrations & Events
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {user && !isDemoMode && (
            <button
              onClick={() => seedSampleEventToCloud()}
              disabled={isSyncing}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy initial celebration baseline to your Cloud Firestore account"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Import Celebration Baseline</span>
            </button>
          )}

          <button
            onClick={() => setOnboardingOpen(true)}
            className="px-4 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Plan Another Event</span>
          </button>
        </div>
      </div>

      {/* Cloud Account Empty State */}
      {user && !isDemoMode && events.length === 0 ? (
        <div className="bg-white border border-[#231530]/10 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Cloud className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-[#231530] font-display">
              Welcome to Your Cloud Portfolio!
            </h3>
            <p className="text-xs text-[#231530]/60 max-w-md mx-auto leading-relaxed">
              You are signed in as <strong>{user.email}</strong>. Per security guidelines, your cloud account starts clean with zero assumptions.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setOnboardingOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Plan My First Celebration</span>
            </button>

            <button
              onClick={() => seedSampleEventToCloud()}
              disabled={isSyncing}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#FAF7F2] hover:bg-neutral-200 text-[#231530] text-xs font-semibold rounded-xl border border-[#231530]/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#E06D28]" />
              <span>Import Jaipur Wedding (₹12L)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Events Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const isActive = ev.id === activeEventId;
            const evCategories = categories.filter((c) => c.eventId === ev.id);
            const evTasks = tasks.filter((t) => t.eventId === ev.id);
            const completedTasks = evTasks.filter((t) => t.status === 'completed');

            return (
              <div
                key={ev.id}
                className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all relative ${
                  isActive
                    ? 'border-[#E06D28] ring-2 ring-[#E06D28]/20'
                    : 'border-[#231530]/10 hover:border-[#231530]/30'
                }`}
              >
                {/* Active Badge */}
                {isActive && (
                  <div className="absolute top-4 right-4 text-[10px] uppercase font-bold text-[#E06D28] bg-[#E06D28]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E06D28]" />
                    <span>Active Workspace</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#231530]/60 capitalize">
                      {ev.type} Plan · {ev.tier} Tier
                    </span>
                    <h3 className="text-lg font-bold text-[#231530] font-display mt-0.5">
                      {ev.name}
                    </h3>
                    <div className="text-xs text-[#231530]/60 mt-0.5">
                      {ev.city}, {ev.state}
                    </div>
                  </div>

                  {/* Details strip */}
                  <div className="p-3 bg-[#FAF7F2] rounded-xl space-y-1.5 text-xs text-[#231530]/80">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[#231530]/60">
                        <IndianRupee className="w-3.5 h-3.5 text-[#E06D28]" /> Budget Cap:
                      </span>
                      <span className="font-mono font-bold text-[#231530]">
                        {formatINR(ev.totalBudget)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[#231530]/60">
                        <Users className="w-3.5 h-3.5 text-[#E06D28]" /> Guest Headcount:
                      </span>
                      <span className="font-mono font-semibold text-[#231530]">
                        {ev.guestCount} ({ev.foodPreference})
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5 text-[#231530]/60">
                        <Calendar className="w-3.5 h-3.5 text-[#E06D28]" /> Date:
                      </span>
                      <span className="font-medium text-[#231530]">
                        {formatEventDate(ev.eventDate)}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px] text-[#231530]/60">
                      <span>Task Completion</span>
                      <span className="font-mono">
                        {completedTasks.length}/{evTasks.length} tasks
                      </span>
                    </div>
                    <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#E06D28] h-full rounded-full"
                        style={{
                          width: `${
                            evTasks.length > 0
                              ? Math.round((completedTasks.length / evTasks.length) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="pt-4 border-t border-[#231530]/5 mt-4">
                  {isActive ? (
                    <button
                      onClick={() => setCurrentTab('dashboard')}
                      className="w-full py-2.5 px-3 bg-[#231530] text-white text-xs font-semibold rounded-xl hover:bg-[#3A2350] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveEventId(ev.id);
                        setCurrentTab('dashboard');
                      }}
                      className="w-full py-2.5 px-3 bg-[#FAF7F2] hover:bg-[#E06D28] hover:text-white text-[#231530] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Switch to this Event</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Create new event card */}
          <button
            onClick={() => setOnboardingOpen(true)}
            className="border-2 border-dashed border-[#231530]/15 hover:border-[#E06D28] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center transition-all group bg-white/40 hover:bg-white cursor-pointer min-h-[280px]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E06D28]/10 text-[#E06D28] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#231530]">Plan a New Celebration</div>
              <div className="text-xs text-[#231530]/60 mt-1 max-w-[200px]">
                Wedding, Birthday party, or Community assembly
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
