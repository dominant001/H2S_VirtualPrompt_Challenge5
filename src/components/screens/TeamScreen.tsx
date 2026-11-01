import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Phone,
  CheckCircle2,
  Edit2,
  Plus,
  Sparkles,
  Check,
  ArrowRight,
  Mail,
  Copy,
  UserPlus,
  Briefcase,
  Home,
  Shield,
  Heart,
  Clock,
  Send,
  X,
} from 'lucide-react';
import { DirectoryType, TeamMember } from '../../types';

const DIRECTORY_TABS: { id: 'all' | DirectoryType; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
  { id: 'all', label: 'All Directories', icon: Users, color: 'text-[#231530]' },
  { id: 'family', label: 'Family Roster', icon: Home, color: 'text-[#E06D28]' },
  { id: 'office', label: 'Office Colleagues', icon: Briefcase, color: 'text-blue-600' },
  { id: 'community', label: 'Community & Society', icon: Heart, color: 'text-purple-600' },
  { id: 'volunteers', label: 'Volunteers & Marshals', icon: Shield, color: 'text-emerald-600' },
];

const DIRECTORY_BADGES: Record<DirectoryType, { label: string; bg: string; text: string; border: string }> = {
  family: { label: 'Family Roster', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  office: { label: 'Office Colleague', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  community: { label: 'Community Lead', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  volunteers: { label: 'Volunteer Marshal', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export const TeamScreen: React.FC = () => {
  const { teamMembers, tasks, updateTeamMember, addTeamMember, setCurrentTab, activeEvent, showToast } = useApp();

  const [selectedDirectory, setSelectedDirectory] = useState<'all' | DirectoryType>('all');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [responsibilityInput, setResponsibilityInput] = useState<string>('');

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    directoryType: 'office' as DirectoryType,
    relation: '',
    responsibilities: '',
    phone: '',
    customMessage: '',
  });

  const filteredMembers = teamMembers.filter((m) => {
    if (selectedDirectory === 'all') return true;
    return m.directoryType === selectedDirectory;
  });

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
    showToast(`Updated responsibilities for ${editingMember.name}.`, 'info');
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      showToast('Please provide a name and email address.', 'warning');
      return;
    }

    const respList = inviteForm.responsibilities
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    const avatarBgs = ['bg-[#E06D28]', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
    const randomBg = avatarBgs[Math.floor(Math.random() * avatarBgs.length)];

    addTeamMember({
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      phone: inviteForm.phone.trim() || undefined,
      relation: inviteForm.relation.trim() || (inviteForm.directoryType === 'office' ? 'Office Colleague' : inviteForm.directoryType === 'community' ? 'Community Committee' : inviteForm.directoryType === 'volunteers' ? 'Volunteer Lead' : 'Family Member'),
      directoryType: inviteForm.directoryType,
      avatarBg: randomBg,
      primaryResponsibilities: respList.length > 0 ? respList : ['Event Coordination & Execution'],
      status: 'invited',
      invitedAt: new Date().toISOString(),
      invitedBy: 'Event Organizer',
    });

    showToast(`Invitation email simulated to ${inviteForm.email} for ${inviteForm.name}!`, 'success');
    setInviteModalOpen(false);
    setInviteForm({
      name: '',
      email: '',
      directoryType: 'office',
      relation: '',
      responsibilities: '',
      phone: '',
      customMessage: '',
    });
  };

  const generatedInviteLink = `https://utsav.app/join/${activeEvent.id}?inviter=${encodeURIComponent(inviteForm.name || 'Friend')}&dir=${inviteForm.directoryType}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedInviteLink).catch(() => {});
    setCopiedLink(true);
    showToast('Invitation link copied to clipboard!', 'info');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Directory & Team Delegation</span>
            <span className="text-[#231530]/40">·</span>
            <span>Role Distribution Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Team & Directory Roster
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-[#231530]/60 bg-white border border-[#231530]/10 px-3.5 py-2 rounded-xl">
            <span>{teamMembers.length} Members Across Directories</span>
          </div>

          {/* Invite Friend / Colleague Button */}
          <button
            onClick={() => setInviteModalOpen(true)}
            className="px-4 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Friend / Colleague</span>
          </button>
        </div>
      </div>

      {/* Directory Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs bg-white border border-[#231530]/10 p-2 rounded-2xl shadow-xs">
        {DIRECTORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === 'all'
              ? teamMembers.length
              : teamMembers.filter((m) => m.directoryType === tab.id).length;
          const isSelected = selectedDirectory === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedDirectory(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-[#231530] text-white shadow-xs font-semibold'
                  : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530] hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#E06D28]' : tab.color}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#231530]/10 text-[#231530]/80'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rationale Banner */}
      <div className="p-4 bg-white border border-[#231530]/10 rounded-2xl flex items-center justify-between gap-4 text-xs text-[#231530]/80">
        <div>
          <strong className="font-semibold text-[#231530]">Categorized Delegation:</strong>{' '}
          {activeEvent.type === 'community'
            ? 'Community festivals require structured collaboration across Office Colleagues, Society Committee leads, and Volunteer Marshals.'
            : activeEvent.type === 'birthday'
            ? 'Milestone celebrations run smoothly when family leads, office buddies, and vendors take ownership of distinct operational tracks.'
            : 'Indian weddings succeed when family elders, office friends, and logistics volunteers manage designated event pillars.'}
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
        {filteredMembers.length === 0 ? (
          <div className="col-span-full bg-white border border-[#231530]/10 rounded-2xl p-12 text-center text-xs text-[#231530]/60 space-y-3">
            <Users className="w-8 h-8 text-[#231530]/30 mx-auto" />
            <p className="font-semibold text-[#231530]">No team members in this directory yet.</p>
            <p className="text-[11px] text-[#231530]/50">
              Click "Invite Friend / Colleague" above to onboard members into this category.
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const assignedTasks = tasks.filter((t) => t.ownerId === member.id);
            const completedTasks = assignedTasks.filter((t) => t.status === 'completed');
            const percent =
              assignedTasks.length > 0
                ? Math.round((completedTasks.length / assignedTasks.length) * 100)
                : 0;

            const badge = DIRECTORY_BADGES[member.directoryType || 'family'];

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
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#231530] text-base">{member.name}</h3>
                          {member.status === 'invited' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Invited
                            </span>
                          )}
                        </div>
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

                  {/* Directory Badge & Contact Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#231530]/5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>

                    {member.email && (
                      <div className="flex items-center gap-1 text-[11px] text-[#231530]/60 font-mono truncate max-w-[170px]" title={member.email}>
                        <Mail className="w-3 h-3 text-[#231530]/40 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
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
                  {assignedTasks.length === 0 && (
                    <div className="text-[11px] text-[#231530]/40 italic">No tasks assigned yet</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite Friend / Colleague Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231530]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#231530]/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#231530]/10 flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#E06D28]/10 text-[#E06D28] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#231530] font-display">
                    Invite Team Member to Directory
                  </h3>
                  <p className="text-xs text-[#231530]/60">
                    Onboard office colleagues, family leads, or volunteer marshals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 text-[#231530]/40 hover:text-[#231530] rounded-xl hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form & Preview */}
            <form onSubmit={handleSendInvite} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Directory Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#231530] mb-1.5">
                  Target Directory Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'office', label: 'Office', icon: Briefcase, color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
                    { type: 'family', label: 'Family', icon: Home, color: 'border-orange-300 text-orange-700 bg-orange-50/50' },
                    { type: 'community', label: 'Community', icon: Heart, color: 'border-purple-300 text-purple-700 bg-purple-50/50' },
                    { type: 'volunteers', label: 'Volunteers', icon: Shield, color: 'border-emerald-300 text-emerald-700 bg-emerald-50/50' },
                  ].map((d) => {
                    const Icon = d.icon;
                    const isSelected = inviteForm.directoryType === d.type;
                    return (
                      <button
                        type="button"
                        key={d.type}
                        onClick={() => setInviteForm({ ...inviteForm, directoryType: d.type as DirectoryType })}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#E06D28] bg-[#E06D28]/10 text-[#E06D28] font-bold shadow-xs'
                            : 'border-[#231530]/15 bg-white text-[#231530]/70 hover:border-[#231530]/30'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Member Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Verma"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rohan.verma@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
                  />
                </div>
              </div>

              {/* Relation / Designation & Responsibilities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Designation / Role Tag
                  </label>
                  <input
                    type="text"
                    placeholder={
                      inviteForm.directoryType === 'office'
                        ? 'e.g. Tech Lead / Catering Committee'
                        : inviteForm.directoryType === 'community'
                        ? 'e.g. Stage & DJ Coordinator'
                        : 'e.g. Food Stall Manager'
                    }
                    value={inviteForm.relation}
                    onChange={(e) => setInviteForm({ ...inviteForm, relation: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#231530] mb-1">
                  Responsibilities / Pillars (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Food Stalls, DJ Sound Setup, Food Clearances"
                  value={inviteForm.responsibilities}
                  onChange={(e) => setInviteForm({ ...inviteForm, responsibilities: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] text-[#231530]"
                />
              </div>

              {/* Email Invitation Preview Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-700 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulated Invitation Email Preview</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-amber-400 hover:underline font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Invite Link'}</span>
                  </button>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-semibold text-amber-300">
                    To: {inviteForm.email || 'colleague@example.com'}
                  </p>
                  <p className="font-bold text-white text-sm pt-1">
                    Subject: You're invited to help organize {activeEvent.name}!
                  </p>
                  <p className="text-[#FAF7F2]/80 leading-relaxed pt-1 text-[11px]">
                    Hi {inviteForm.name || 'Team Member'}, you've been nominated as a key owner in the{' '}
                    <strong className="text-amber-300">{inviteForm.directoryType.toUpperCase()} DIRECTORY</strong> for{' '}
                    <strong>{activeEvent.name}</strong> ({activeEvent.city}). Access the task delegation roster and track responsibilities:
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 truncate bg-slate-800 p-1.5 rounded-md mt-2">
                    {generatedInviteLink}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#231530]/10">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#231530]/70 hover:text-[#231530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E06D28] text-white text-xs font-semibold rounded-xl hover:bg-[#C4551D] flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Invitation Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Responsibility Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231530]/60 backdrop-blur-xs animate-in fade-in">
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
                placeholder="e.g. Catering Stalls, DJ Sound Setup, Food Clearances"
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
