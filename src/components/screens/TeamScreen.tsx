import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Users, Phone, CheckCircle2, Edit2, Plus, Sparkles, Check, ArrowRight } from 'lucide-react';
import { TeamMember } from '../../types';

export const TeamScreen: React.FC = () => {
  const { teamMembers, tasks, updateTeamMember, setCurrentTab, activeEvent } = useApp();

  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [responsibilityInput, setResponsibilityInput] = useState<string>('');

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setResponsibilityInput(member.primaryResponsibilities.join(', '));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const list = responsibilityInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    updateTeamMember(editingMember.id, list);
    setEditingMember(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Family Coordination</span>
            <span className="text-[#231530]/40">·</span>
            <span>Accountability & Role Delegation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Team & Family Responsibilities
          </h1>
        </div>

        <div className="text-xs text-[#231530]/60 bg-white border border-[#231530]/10 px-3.5 py-2 rounded-xl">
          <span>{teamMembers.length} Family Leads Active</span>
        </div>
      </div>

      {/* Rationale Banner */}
      <div className="p-4 bg-white border border-[#231530]/10 rounded-2xl flex items-center justify-between gap-4 text-xs text-[#231530]/80">
        <div>
          <strong className="font-semibold text-[#231530]">Distributed Ownership:</strong>{' '}
          {activeEvent.type === 'birthday'
            ? 'Milestone birthdays succeed when distinct pillars (Theme & Cake, Venue & Games, Photography, Return Gifts) have single accountable owners.'
            : activeEvent.type === 'community'
            ? 'Community assemblies succeed when distinct pillars (Ground Clearances, Volunteers, Audio-Visual, Hospitality) have single accountable leads.'
            : 'Indian celebrations succeed when distinct pillars (Ceremony Logistics, Catering, Outfits, Photography) have single accountable family owners.'}
        </div>
        <button
          onClick={() => setCurrentTab('checklist')}
          className="text-[#E06D28] font-semibold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <span>View Task Roster</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => {
          const assignedTasks = tasks.filter((t) => t.ownerId === member.id);
          const completedTasks = assignedTasks.filter((t) => t.status === 'completed');
          const percent =
            assignedTasks.length > 0
              ? Math.round((completedTasks.length / assignedTasks.length) * 100)
              : 0;

          return (
            <div
              key={member.id}
              className="bg-white border border-[#231530]/10 rounded-2xl p-6 shadow-xs space-y-4 hover:border-[#231530]/25 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${member.avatarBg} text-white flex items-center justify-center font-bold text-base shadow-xs`}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#231530] text-base">{member.name}</h3>
                      <div className="text-xs font-medium text-[#E06D28]">{member.relation}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="p-1.5 text-[#231530]/40 hover:text-[#231530] rounded-lg transition-colors cursor-pointer"
                    title="Edit Responsibilities"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {member.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-[#231530]/60">
                    <Phone className="w-3.5 h-3.5 text-[#231530]/40" />
                    <span>{member.phone}</span>
                  </div>
                )}

                {/* Assigned Task Progress */}
                <div className="p-3 bg-[#FAF7F2] rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#231530]/70 font-medium">Assigned Tasks:</span>
                    <span className="font-mono font-bold text-[#231530]">
                      {completedTasks.length}/{assignedTasks.length} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-white h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#E06D28] h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Primary Responsibilities Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#231530]/60 block">
                    Core Focus Pillars:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.primaryResponsibilities.map((resp, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-[#FAF7F2] border border-[#231530]/10 text-[#231530]/80 px-2 py-0.5 rounded-md"
                      >
                        {resp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Task list preview */}
              <div className="pt-3 border-t border-[#231530]/5 text-xs space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#231530]/50">
                  Active Checklist Items:
                </span>
                {assignedTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="truncate text-[#231530]/70 flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.status === 'completed' ? 'bg-emerald-500' : 'bg-[#E06D28]'
                      }`}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Responsibility Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-[#231530]/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-[#231530]/10 pb-3">
              <div>
                <h3 className="font-bold text-[#231530] font-display text-base">
                  Edit Responsibilities
                </h3>
                <div className="text-xs text-[#231530]/60">
                  {editingMember.name} ({editingMember.relation})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-xs text-[#231530]/60 hover:text-[#231530]"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#231530]/70 mb-1">
                Pillars (comma separated)
              </label>
              <textarea
                rows={3}
                value={responsibilityInput}
                onChange={(e) => setResponsibilityInput(e.target.value)}
                placeholder="e.g. Venue Contract, Panditji, Overall Budget"
                className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
              />
              <p className="text-[11px] text-[#231530]/50 mt-1">
                Updates will reflect immediately in team cards and checklist filters.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#231530]/10">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-xs text-[#231530]/70 hover:text-[#231530]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#E06D28] text-white text-xs font-semibold rounded-xl hover:bg-[#C4551D]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
