import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatINRCompact, formatEventDate } from '../../utils/currency';
import {
  Calendar,
  Users,
  IndianRupee,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Plus,
  Compass,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    activeEvent,
    categories,
    tasks,
    setCurrentTab,
    setCopilotOpen,
    createGuestProposal,
    setEventDate,
    toggleSubtask,
    updateTaskStatus,
    showToast,
  } = useApp();

  const [dateInputOpen, setDateInputOpen] = useState(false);
  const [newDateValue, setNewDateValue] = useState('');

  // Calculations
  const eventCategories = categories.filter((c) => c.eventId === activeEvent.id);
  const totalAllocated = eventCategories.reduce((acc, c) => acc + c.allocated, 0);
  const contingencyCategory = eventCategories.find((c) => c.isContingency || c.name.toLowerCase().includes('contingency'));
  const reserveAmount = contingencyCategory ? contingencyCategory.allocated : 0;
  const committedAmount = eventCategories.reduce((acc, c) => acc + c.committed, 0);
  const paidAmount = eventCategories.reduce((acc, c) => acc + c.paid, 0);

  const baseGuests = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
  const targetSimGuests = Math.round(baseGuests * 1.25);

  // Leaf task completion percentage
  const eventTasks = tasks.filter((t) => t.eventId === activeEvent.id);
  let totalLeafTasks = 0;
  let completedLeafTasks = 0;

  eventTasks.forEach((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks.forEach((st) => {
        totalLeafTasks += 1;
        if (st.completed) completedLeafTasks += 1;
      });
    } else {
      totalLeafTasks += 1;
      if (t.status === 'completed') completedLeafTasks += 1;
    }
  });

  const completionPercent = totalLeafTasks > 0 ? Math.round((completedLeafTasks / totalLeafTasks) * 100) : 0;

  // Next high-priority pending tasks
  const pendingPriorityTasks = eventTasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => (a.priority === 'high' ? -1 : 1))
    .slice(0, 5);

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDateValue) {
      setEventDate(newDateValue);
      setDateInputOpen(false);
    }
  };

  const { events, setOnboardingOpen, seedSampleEventToCloud, isSyncing } = useApp();

  if (events.length === 0) {
    return (
      <div className="bg-white border border-[#231530]/10 rounded-3xl p-10 sm:p-16 text-center max-w-xl mx-auto space-y-5 shadow-xs my-8 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#E06D28] flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-[#231530] font-display">
            Your Cloud Portfolio is Ready
          </h2>
          <p className="text-xs text-[#231530]/60 max-w-md mx-auto leading-relaxed">
            You are authenticated in Cloud Firestore. Start planning a celebration or import a starter baseline with one click.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setOnboardingOpen(true)}
            className="w-full sm:w-auto px-5 py-3 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Plan New Celebration</span>
          </button>
          <button
            onClick={() => seedSampleEventToCloud()}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-3 bg-[#FAF7F2] hover:bg-neutral-200 text-[#231530] text-xs font-semibold rounded-xl border border-[#231530]/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-[#E06D28]" />
            <span>Import Starter Baseline</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Event Banner Card */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#E06D28] bg-[#E06D28]/10 px-2.5 py-0.5 rounded-full">
                {activeEvent.type} Plan
              </span>
              <span className="text-[#231530]/40">·</span>
              <span className="text-[#231530]/70 font-medium capitalize">{activeEvent.tier} Tier</span>
              <span className="text-[#231530]/40">·</span>
              <span className="text-[#231530]/70 font-medium">{activeEvent.city}, {activeEvent.state}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
              {activeEvent.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#231530]/80 pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-[#E06D28]" />
                <span className="font-mono tabular-nums font-semibold">{activeEvent.guestCount}</span> Guests ({activeEvent.foodPreference})
              </div>

              <div className="flex items-center gap-1.5 font-medium">
                <IndianRupee className="w-4 h-4 text-[#E06D28]" />
                <span className="font-mono tabular-nums font-semibold">{formatINR(activeEvent.totalBudget)}</span> Total Cap
              </div>

              {/* Exact vs Unconfirmed Date Handling */}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#E06D28]" />
                {activeEvent.eventDate ? (
                  <span className="font-semibold text-[#231530]">
                    {formatEventDate(activeEvent.eventDate)}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      Date to be confirmed
                    </span>
                    <button
                      onClick={() => setDateInputOpen(true)}
                      className="text-[#E06D28] hover:underline font-semibold text-xs cursor-pointer"
                    >
                      Set event date
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Scenario Re-planning CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => createGuestProposal(targetSimGuests)}
              className="px-4 py-3 bg-[#E06D28]/10 hover:bg-[#E06D28]/20 text-[#E06D28] border border-[#E06D28]/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              title={`Deterministic simulation: Increase guests from ${baseGuests} to ${targetSimGuests} with reserve absorption`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate {baseGuests}→{targetSimGuests} Guests</span>
            </button>

            <button
              onClick={() => setCurrentTab('budget')}
              className="px-4 py-3 bg-[#231530] hover:bg-[#3A2350] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>Manage Budget</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Date Setting Modal/Input if user clicks "Set event date" */}
        {dateInputOpen && (
          <form
            onSubmit={handleSaveDate}
            className="mt-4 p-4 bg-[#FAF7F2] border border-[#231530]/15 rounded-xl flex flex-wrap items-center gap-3 animate-in fade-in"
          >
            <span className="text-xs font-semibold text-[#231530]">Set Auspicious Date:</span>
            <input
              type="date"
              value={newDateValue}
              onChange={(e) => setNewDateValue(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#231530]/20 rounded-lg focus:outline-hidden focus:border-[#E06D28]"
              required
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#E06D28] text-white text-xs font-semibold rounded-lg hover:bg-[#C4551D] cursor-pointer"
            >
              Confirm Date
            </button>
            <button
              type="button"
              onClick={() => setDateInputOpen(false)}
              className="px-3 py-1.5 text-xs text-[#231530]/60 hover:text-[#231530] cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* KPI Row (Single-Elevation Cards with Hairlines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Budget Cap & Allocated */}
        <div className="p-5 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span>Total Budget</span>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm font-semibold">
              100% Balanced
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#231530]">
            {formatINR(activeEvent.totalBudget)}
          </div>
          <div className="text-xs text-[#231530]/70 flex justify-between pt-1 border-t border-[#231530]/5">
            <span>Allocated:</span>
            <span className="font-mono tabular-nums font-medium">{formatINR(totalAllocated)}</span>
          </div>
        </div>

        {/* Metric 2: Contingency Reserve */}
        <div className="p-5 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span className="flex items-center gap-1 text-amber-900 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-[#E06D28]" />
              Contingency Reserve
            </span>
            <span className="text-[11px] font-mono font-semibold text-amber-700">
              {Math.round((reserveAmount / activeEvent.totalBudget) * 100)}% Buffer
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
            {formatINR(reserveAmount)}
          </div>
          <div className="text-xs text-[#231530]/70 flex justify-between pt-1 border-t border-[#231530]/5">
            <span>Safety Status:</span>
            <span className="text-emerald-700 font-medium">Protected against overruns</span>
          </div>
        </div>

        {/* Metric 3: Committed & Paid */}
        <div className="p-5 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span>Cash Flow</span>
            <span className="text-[11px] font-mono text-[#231530]/60">Committed / Paid</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#231530]">
            {formatINRCompact(paidAmount)}{' '}
            <span className="text-xs font-normal text-[#231530]/50">paid</span>
          </div>
          <div className="text-xs text-[#231530]/70 flex justify-between pt-1 border-t border-[#231530]/5">
            <span>Vendor Contracts:</span>
            <span className="font-mono tabular-nums font-medium">{formatINR(committedAmount)} committed</span>
          </div>
        </div>

        {/* Metric 4: Checklist Progress Rollup */}
        <div className="p-5 bg-white border border-[#231530]/10 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#231530]/60">
            <span>Checklist Progress</span>
            <span className="text-[11px] font-mono font-semibold text-[#E06D28]">
              {completedLeafTasks}/{totalLeafTasks} Leaf items
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#231530]">
            {completionPercent}%
          </div>
          <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-[#E06D28] h-full rounded-full transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Tasks + Risks + AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Priority Tasks & Invitation Dependency Tracker */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Checklist Card */}
          <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#231530] font-display text-lg">Next Priority Tasks</h3>
                <p className="text-xs text-[#231530]/60 mt-0.5">
                  Filtered by urgent milestones and assigned family owners
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('checklist')}
                className="text-xs font-semibold text-[#E06D28] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Checklist</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#231530]/5">
              {pendingPriorityTasks.map((task) => (
                <div key={task.id} className="py-3.5 flex items-start gap-3 group">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() =>
                      updateTaskStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')
                    }
                    className="mt-1 w-4 h-4 rounded-md accent-[#E06D28] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#231530] group-hover:text-[#E06D28] transition-colors">
                        {task.title}
                      </span>
                      {task.priority === 'high' && (
                        <span className="text-[10px] text-rose-700 font-semibold uppercase bg-rose-50 px-1.5 py-0.5 rounded-sm">
                          High
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#231530]/60 mt-1">
                      <span>{task.categoryName}</span>
                      <span>·</span>
                      <span className="font-medium text-[#231530]/80">
                        {task.ownerName || 'Unassigned'} ({task.ownerRole})
                      </span>
                      {task.relativeOffsetDays !== undefined && (
                        <>
                          <span>·</span>
                          <span className="font-mono">
                            {task.relativeOffsetDays === 0
                              ? 'Event Day'
                              : `T${task.relativeOffsetDays} days`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Subtasks snippet */}
                    {task.subtasks.length > 0 && (
                      <div className="mt-2 pl-2 border-l-2 border-[#231530]/10 space-y-1">
                        {task.subtasks.slice(0, 2).map((st) => (
                          <div key={st.id} className="flex items-center gap-2 text-[11px]">
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => toggleSubtask(task.id, st.id)}
                              className="w-3 h-3 accent-[#E06D28] cursor-pointer"
                            />
                            <span className={st.completed ? 'line-through text-[#231530]/40' : 'text-[#231530]/80'}>
                              {st.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Dependency Pipeline Card (Contextual to Celebration Type) */}
          <div className="bg-[#FAF7F2] border border-[#231530]/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
                Critical Dependency Pipeline
              </span>
              <span className="text-[11px] text-[#231530]/60">Context: {activeEvent.type.toUpperCase()}</span>
            </div>
            {activeEvent.type === 'birthday' ? (
              <>
                <h4 className="font-bold text-[#231530] text-sm">
                  Birthday Theme, Cake &amp; RSVP Pipeline
                </h4>
                <p className="text-xs text-[#231530]/70 leading-relaxed">
                  Digital birthday invitations, baker specifications for custom cake, and activity kits for {activeEvent.guestCount || 50} guests. Personalized return favor hampers locked against confirmed RSVPs.
                </p>
                <div className="flex items-center gap-1.5 pt-2 overflow-x-auto text-[11px] font-mono text-[#231530]/70">
                  <span className="text-emerald-700 font-semibold">1. Theme ✓</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">2. Invites ✓</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">3. Baker Order ✓</span>
                  <span>→</span>
                  <span className="text-[#E06D28] font-bold bg-[#E06D28]/10 px-1.5 py-0.5 rounded-sm">4. RSVPs</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">5. Favors</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">6. Party Day</span>
                </div>
              </>
            ) : activeEvent.type === 'community' ? (
              <>
                <h4 className="font-bold text-[#231530] text-sm">
                  Community Assembly &amp; Permissions Pipeline
                </h4>
                <p className="text-xs text-[#231530]/70 leading-relaxed">
                  Ground reservation, sound level clearance, and volunteer registration desks for {activeEvent.guestCount || 300} community members.
                </p>
                <div className="flex items-center gap-1.5 pt-2 overflow-x-auto text-[11px] font-mono text-[#231530]/70">
                  <span className="text-emerald-700 font-semibold">1. Venue ✓</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">2. Permits ✓</span>
                  <span>→</span>
                  <span className="text-[#E06D28] font-bold bg-[#E06D28]/10 px-1.5 py-0.5 rounded-sm">3. Volunteers</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">4. Stage &amp; AV</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">5. Assembly</span>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-bold text-[#231530] text-sm">
                  Wedding Invitation &amp; Ritual Logistics
                </h4>
                <p className="text-xs text-[#231530]/70 leading-relaxed">
                  Batch printing of boxed wedding invitations, elder distribution, and ritual samagri coordination for {activeEvent.guestCount || 200} guests.
                </p>
                <div className="flex items-center gap-1.5 pt-2 overflow-x-auto text-[11px] font-mono text-[#231530]/70">
                  <span className="text-emerald-700 font-semibold">1. Roster ✓</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">2. Design ✓</span>
                  <span>→</span>
                  <span className="text-emerald-700 font-semibold">3. Proof ✓</span>
                  <span>→</span>
                  <span className="text-[#E06D28] font-bold bg-[#E06D28]/10 px-1.5 py-0.5 rounded-sm">4. Printing</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">5. Pickup</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">6. Dispatch</span>
                  <span>→</span>
                  <span className="text-[#231530]/40">7. RSVP</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right 1 Column: Risk Notices & AI Recommendations */}
        <div className="space-y-6">
          {/* Dynamic Planning Risk Monitor (Tailored to Event Type) */}
          <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Planning Risk Monitor</span>
            </div>

            <div className="space-y-3 text-xs">
              {activeEvent.type === 'birthday' ? (
                <>
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-amber-900">Custom Cake Delivery Window</div>
                    <div className="text-amber-800/80 leading-relaxed">
                      Confirm designer cake delivery 3 hours before start. Verify venue has refrigerated storage for {activeEvent.guestCount || 50} portions.
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-rose-900">
                      {!activeEvent.eventDate ? 'Party Date Pending Lock' : 'Play Area & Activity Zone Safety'}
                    </div>
                    <div className="text-rose-800/80 leading-relaxed">
                      {!activeEvent.eventDate
                        ? 'Lock party date to secure party hall slot and professional entertainer/emcee booking.'
                        : 'Verify safety mats, game host briefing, and age-appropriate prize distribution.'}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-amber-900">Return Favors Hamper Count</div>
                    <div className="text-amber-800/80 leading-relaxed">
                      Lock RSVP headcount 7 days prior to party to package customized name hampers for all attending children.
                    </div>
                  </div>
                </>
              ) : activeEvent.type === 'community' ? (
                <>
                  <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-rose-900">
                      {!activeEvent.eventDate ? 'Assembly Date Pending Lock' : 'Sound Decibel & Civic Clearances'}
                    </div>
                    <div className="text-rose-800/80 leading-relaxed">
                      {!activeEvent.eventDate
                        ? 'Confirm date to submit municipal lawn booking and security clearance.'
                        : 'Check local municipal sound permit for outdoor public address speakers.'}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-amber-900">Volunteer Captain Briefing</div>
                    <div className="text-amber-800/80 leading-relaxed">
                      Assign team leads for registration kiosks, water distribution, and first-aid station for {activeEvent.guestCount || 300} attendees.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-rose-900">
                      {!activeEvent.eventDate ? 'Muhurat Date Pending Lock' : 'Mandap & Electrical Setup Clearance'}
                    </div>
                    <div className="text-rose-800/80 leading-relaxed">
                      {!activeEvent.eventDate
                        ? 'Relative offsets are active. Lock auspicious muhurat date soon to confirm heritage lawn venue and sound permits.'
                        : 'Verify 125 kVA silent backup generator for floral mandap focus lighting and dining hall setup.'}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                    <div className="font-semibold text-amber-900">Catering Headcount Guarantee Cutoff</div>
                    <div className="text-amber-800/80 leading-relaxed">
                      Final plate count guarantee for {activeEvent.guestCount || 200} guests must be formally signed 14 days prior to wedding feast.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Recommendations (Dynamic to Celebration Context) */}
          <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
                <Sparkles className="w-4 h-4 text-[#E06D28]" />
                <span>AI Copilot Insights</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                AI Copilot Active
              </span>
            </div>

            <div className="text-xs text-[#231530]/80 space-y-2.5 leading-relaxed">
              {(() => {
                const baseGuests = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
                const extraGuests = Math.max(5, Math.round(baseGuests * 0.25));
                const targetGuests = baseGuests + extraGuests;
                const plateRate = activeEvent.cateringModel.sampleRatePerPlate || Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, baseGuests));
                const simAddedCost = extraGuests * plateRate;

                if (activeEvent.type === 'birthday') {
                  return (
                    <>
                      <p>
                        • <strong>Food &amp; Snacks Simulation:</strong> If you invite {extraGuests} extra guests ({baseGuests} → {targetGuests}), your catering and beverages estimate adjusts by +{formatINR(simAddedCost)}. Your contingency reserve can absorb this safely.
                      </p>
                      <p>
                        • <strong>Theme &amp; Activities:</strong> Ensure return gifts and party favor boxes match confirmed RSVPs plus 5 standby sets for unexpected siblings.
                      </p>
                    </>
                  );
                } else if (activeEvent.type === 'community') {
                  return (
                    <>
                      <p>
                        • <strong>Capacity Sensitivity:</strong> Expanding assembly from {baseGuests} to {targetGuests} attendees (+{extraGuests}) requires +2 refreshment water dispensers and 1 additional registration kiosk.
                      </p>
                      <p>
                        • <strong>Civic Check:</strong> Confirm stage barricading and emergency exit signage with municipal venue staff.
                      </p>
                    </>
                  );
                } else {
                  return (
                    <>
                      <p>
                        • <strong>Catering buffer test:</strong> If you invite {extraGuests} extra guests ({baseGuests} → {targetGuests}), your catering estimate increases by +{formatINR(simAddedCost)}. Your contingency reserve can absorb this safely.
                      </p>
                      <p>
                        • <strong>Vendor inclusion check:</strong> Ensure the mandap and stage decor contract includes warm ambient lighting and power distribution.
                      </p>
                    </>
                  );
                }
              })()}
            </div>

            <button
              onClick={() => setCopilotOpen(true)}
              className="w-full mt-2 py-2.5 px-3 bg-[#FAF7F2] hover:bg-[#E06D28]/10 text-[#231530] hover:text-[#E06D28] text-xs font-semibold rounded-xl border border-[#231530]/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ask Copilot for Advice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white border border-[#231530]/10 rounded-2xl p-4 shadow-xs text-xs space-y-2">
            <div className="font-semibold text-[#231530]/70 uppercase tracking-wider text-[11px]">
              Quick Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrentTab('budget')}
                className="p-2.5 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white rounded-lg text-left transition-colors font-medium cursor-pointer"
              >
                Budget Studio
              </button>
              <button
                onClick={() => setCurrentTab('vendors')}
                className="p-2.5 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white rounded-lg text-left transition-colors font-medium cursor-pointer"
              >
                Vendor Hub
              </button>
              <button
                onClick={() => setCurrentTab('inspiration')}
                className="p-2.5 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white rounded-lg text-left transition-colors font-medium cursor-pointer"
              >
                Inspiration
              </button>
              <button
                onClick={() => setCurrentTab('team')}
                className="p-2.5 bg-[#FAF7F2] hover:bg-[#231530] hover:text-white rounded-lg text-left transition-colors font-medium cursor-pointer"
              >
                Family Team
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
