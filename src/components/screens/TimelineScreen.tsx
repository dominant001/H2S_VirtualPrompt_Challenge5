import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatEventDate } from '../../utils/currency';
import { ChecklistEngine } from '../../domain/checklistEngine';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Link2,
  Filter,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Music,
  Flame,
  Utensils,
} from 'lucide-react';

export const TimelineScreen: React.FC = () => {
  const { activeEvent, tasks, teamMembers, categories } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timelineMode, setTimelineMode] = useState<'milestones' | 'event_day'>('milestones');

  const eventTasks = tasks.filter((t) => t.eventId === activeEvent.id);
  const activeCategories = categories.filter((c) => c.eventId === activeEvent.id);

  // Group tasks by relative offset
  const sortedTasks = [...eventTasks].sort((a, b) => {
    const aOffset = a.relativeOffsetDays ?? 0;
    const bOffset = b.relativeOffsetDays ?? 0;
    return aOffset - bOffset; // ascending: -75, -60, -40, -10, 0
  });

  const filteredTasks = sortedTasks.filter((t) => {
    if (selectedCategory !== 'all' && t.categoryName.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Pre-curated Event Day Run of Show (Dynamic to celebration type)
  const getEventDaySchedule = () => {
    const guestCount = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);

    if (activeEvent.type === 'birthday') {
      return [
        {
          time: '10:00 AM',
          title: 'Party Room Access & Theme Balloon Decor Setup',
          owner: 'Party Host / Coordinator',
          icon: Sun,
          desc: 'Inspect balloon arches, photo-backdrop, child-safe furniture layout, and sound decibel limits.',
        },
        {
          time: '01:00 PM',
          title: 'Custom Birthday Cake Delivery & Refrigeration Inspection',
          owner: 'Cake Baker & Venue Manager',
          icon: Sparkles,
          desc: `Verify delivery of custom designer cake, theme candle toppers, and specialized cold storage for ${guestCount} portions.`,
        },
        {
          time: '03:30 PM',
          title: 'Emcee & Game Host Technical Rehearsal',
          owner: 'Entertainment Host',
          icon: Music,
          desc: 'Setup microphone audio, test party music playlist, and organize game prizes and winner medals.',
        },
        {
          time: '04:30 PM',
          title: 'Guest Arrival, Welcome Drinks & Tattoo/Photo Corner',
          owner: 'Family Welcome Hosts',
          icon: CheckCircle2,
          desc: `Greet child guests and families; hand out party hats and personalized wristbands for ${guestCount} attendees.`,
        },
        {
          time: '05:30 PM',
          title: 'Interactive Party Games & Magic / Dance Show',
          owner: 'Emcee & Game Coordinators',
          icon: Sparkles,
          desc: 'Organize musical games, interactive quizzes, balloon sculpting, and dance-offs for kids and parents.',
        },
        {
          time: '06:45 PM',
          title: 'Grand Cake Cutting Ceremony & Happy Birthday Anthem',
          owner: 'Birthday Celebrant & Parents',
          icon: Flame,
          desc: 'Gather everyone around the cake table for candle blowing, birthday song anthem, confetti poppers, and photos.',
        },
        {
          time: '07:15 PM',
          title: 'Celebration Dinner Buffet & Live Snack Stations',
          owner: 'Catering Lead',
          icon: Utensils,
          desc: `Buffet and live food stations open for ${guestCount} guests with kids favorites, juices, and hot desserts.`,
        },
        {
          time: '08:30 PM',
          title: 'Personalized Return Favors Distribution & Send-off',
          owner: 'Celebration Hosts',
          icon: Moon,
          desc: 'Distribute customized return gift hampers to attending families with thank-you notes.',
        },
      ];
    } else if (activeEvent.type === 'community') {
      return [
        {
          time: '07:00 AM',
          title: 'Ground Handover & Stage Audio-Visual Setup',
          owner: 'Logistics Team Lead',
          icon: Sun,
          desc: `Setup main stage, podium, 4-speaker public address system, and power generator checks.`,
        },
        {
          time: '09:00 AM',
          title: 'Volunteer Captains Briefing & Registration Desks',
          owner: 'Community Volunteer Leads',
          icon: CheckCircle2,
          desc: `Open badge registration and hand out orientation materials to ${guestCount} members.`,
        },
        {
          time: '10:30 AM',
          title: 'Inaugural Address & Cultural Presentation',
          owner: 'Community Organizing Committee',
          icon: Sparkles,
          desc: 'Opening remarks, community song, and keynote presentation on local initiatives.',
        },
        {
          time: '01:00 PM',
          title: 'Community Lunch Feast (Buffet/Langar)',
          owner: 'Hospitality Lead',
          icon: Utensils,
          desc: `Wholesome meal service for ${guestCount} attendees with organized seating rows and water stations.`,
        },
        {
          time: '03:00 PM',
          title: 'Interactive Forum & Youth Recognition Awards',
          owner: 'Program Moderator',
          icon: Music,
          desc: 'Interactive Q&A session, volunteer certificates, and announcements.',
        },
        {
          time: '05:00 PM',
          title: 'Vote of Thanks & Venue Handback',
          owner: 'Community Secretary',
          icon: Moon,
          desc: 'Cleanup drive, recycling collection, and municipal ground handover inspection.',
        },
      ];
    } else {
      // Wedding Run of Show
      return [
        {
          time: '08:00 AM',
          title: 'Morning Venue Handover & Vendor Walkthrough',
          owner: 'Family Coordinator',
          icon: Sun,
          desc: 'Verify Mandap floral build, electrical generator test, bridal suite readiness, and sound checks.',
        },
        {
          time: '11:00 AM',
          title: 'Bridal & Groom Styling / Safa Tying Session',
          owner: 'Bride & Groom Stylists',
          icon: Sparkles,
          desc: 'Master safa turban artist ties royal safas for groom and family elders. HD bridal makeup begins.',
        },
        {
          time: '03:30 PM',
          title: 'Baraat Assembly & Festive Procession',
          owner: 'Groom Family Leads',
          icon: Music,
          desc: 'Baraat assembles at gateway road; dhol drummers lead procession to main banquet gates.',
        },
        {
          time: '05:00 PM',
          title: 'Milni & Welcoming of the Procession (Toran Bandhan)',
          owner: 'Family Counterparts',
          icon: CheckCircle2,
          desc: 'Traditional garland exchange among family counterparts, perfume spraying, and refreshment sherbets.',
        },
        {
          time: '06:00 PM',
          title: 'Grand Varmala Ceremony on Elevated Stage',
          owner: 'Bride & Groom with Siblings',
          icon: Sparkles,
          desc: 'Bride entry under phoolon ki chaadar; rose petal showers during sacred garland exchange.',
        },
        {
          time: '07:30 PM',
          title: 'Royal Banquet Dinner Feast',
          owner: 'Catering Lead',
          icon: Utensils,
          desc: `Buffet & live chaat counters open for ${guestCount} guests with regional delicacies and hot desserts.`,
        },
        {
          time: '09:30 PM',
          title: 'Sacred Rituals around the Agni Mandap',
          owner: 'Priest & Parents',
          icon: Flame,
          desc: 'Sacred vows, Saptapadi, and blessing ceremony accompanied by classical shehnai music.',
        },
        {
          time: '12:30 AM',
          title: 'Vidaai & Farewell Departure',
          owner: 'Family Elders',
          icon: Moon,
          desc: 'Emotional farewell blessing ceremony and decorated vehicle departure.',
        },
      ];
    }
  };

  const eventDaySchedule = getEventDaySchedule();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Milestone Scheduling</span>
            <span className="text-[#231530]/40">·</span>
            <span>{activeEvent.eventDate ? formatEventDate(activeEvent.eventDate) : 'Relative T-Minus Mode'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Chronological Timeline & Run of Show
          </h1>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#231530]/10 rounded-xl">
          <button
            onClick={() => setTimelineMode('milestones')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              timelineMode === 'milestones'
                ? 'bg-[#231530] text-white font-semibold shadow-xs'
                : 'text-[#231530]/70 hover:text-[#231530]'
            }`}
          >
            Planning Milestones
          </button>
          <button
            onClick={() => setTimelineMode('event_day')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              timelineMode === 'event_day'
                ? 'bg-[#E06D28] text-white font-semibold shadow-xs'
                : 'text-[#231530]/70 hover:text-[#231530]'
            }`}
          >
            Event Day Run-of-Show
          </button>
        </div>
      </div>

      {/* Date Notice */}
      {!activeEvent.eventDate && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Relative Milestones Active:</strong>{' '}
              {activeEvent.type === 'birthday'
                ? 'Exact birthday party date is pending confirmation. Tasks are sequenced safely by T-minus offsets from Party Day (T-0).'
                : activeEvent.type === 'community'
                ? 'Exact assembly date is pending confirmation. Tasks are sequenced safely by T-minus offsets from Assembly Day (T-0).'
                : 'Exact event date is pending family confirmation. Tasks are sequenced safely by T-minus offsets from Event Day (T-0).'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 1: Planning Milestones */}
      {timelineMode === 'milestones' && (
        <div className="space-y-6">
          {/* Timeline Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[#231530]/60 font-medium shrink-0">Filter by category:</span>
            {['all', ...activeCategories.map((c) => c.name)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#231530] text-white font-semibold'
                      : 'bg-white border border-[#231530]/10 text-[#231530]/70 hover:text-[#231530]'
                  }`}
                >
                  {cat === 'all' ? 'All Milestones' : cat}
                </button>
              )
            )}
          </div>

          {/* Chronological Spine */}
          <div className="relative pl-6 sm:pl-8 border-l-2 border-[#E06D28]/30 space-y-6">
            {filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const dateInfo = ChecklistEngine.calculateMilestoneDate(activeEvent.eventDate, task.relativeOffsetDays, 'Asia/Kolkata');
              const prereqs = ChecklistEngine.evaluatePrerequisites(task, eventTasks);

              return (
                <div key={task.id} className="relative group">
                  {/* Spine Node Marker */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 ${
                      isCompleted
                        ? 'bg-emerald-600 border-white ring-2 ring-emerald-600'
                        : prereqs.isBlocked
                        ? 'bg-amber-500 border-white ring-2 ring-amber-500'
                        : task.priority === 'high'
                        ? 'bg-[#E06D28] border-white ring-2 ring-[#E06D28]'
                        : 'bg-white border-[#231530]/40'
                    }`}
                  />

                  {/* Milestone Card */}
                  <div className="bg-white border border-[#231530]/10 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-[#231530]/25 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#E06D28]">
                          {dateInfo.formattedDisplay}
                        </span>
                        {task.dependsOnIds && task.dependsOnIds.length > 0 && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs flex items-center gap-1 ${
                            prereqs.isBlocked ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            <Link2 className="w-2.5 h-2.5" />
                            <span>{prereqs.isBlocked ? 'Blocked by dep' : 'Chained'}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-[#231530]/70">{task.categoryName}</span>
                        <span>·</span>
                        <span className="text-[#231530]/60">{task.subcategoryName}</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm sm:text-base text-[#231530]">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-[#231530]/70 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#231530]/5 text-xs text-[#231530]/60">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#E06D28]" />
                        <span>Owner: <strong>{task.ownerName || 'Unassigned'}</strong></span>
                      </div>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-sm capitalize ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-neutral-100 text-[#231530]/70'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: Event Day Run of Show */}
      {timelineMode === 'event_day' && (
        <div className="bg-white border border-[#231530]/10 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#231530]/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#231530] font-display">
                Main Function Ceremony Schedule (Day of Celebration)
              </h3>
              <p className="text-xs text-[#231530]/60 mt-0.5">
                Exact minute-by-minute protocol coordinated with priest, dhol, caterer, and photographer
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#E06D28] bg-[#E06D28]/10 px-3 py-1 rounded-full">
              Full Day Master Protocol
            </span>
          </div>

          <div className="space-y-4">
            {eventDaySchedule.map((slot, idx) => {
              const Icon = slot.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-[#231530]/10 bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-colors flex flex-col sm:flex-row sm:items-start gap-4"
                >
                  <div className="w-24 shrink-0 font-mono font-bold text-sm text-[#E06D28]">
                    {slot.time}
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-white border border-[#231530]/10 flex items-center justify-center text-[#231530] shrink-0">
                    <Icon className="w-4 h-4 text-[#E06D28]" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-semibold text-sm text-[#231530]">{slot.title}</h4>
                      <span className="text-xs text-[#231530]/60 font-medium">
                        Coordination: <strong>{slot.owner}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-[#231530]/70 leading-relaxed">{slot.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
