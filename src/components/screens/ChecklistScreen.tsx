import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  CheckSquare,
  Search,
  Filter,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Link2,
  Trash2,
  User,
  Calendar,
  Check,
  Clock,
  ArrowRight,
  Tag,
  ShieldAlert,
  ShieldCheck,
  Info,
  X,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { TaskItem, TaskPriority, TaskStatus, DirectoryType } from '../../types';
import { ChecklistEngine } from '../../domain/checklistEngine';
import { ChecklistClient } from '../../services/checklistClient';
import { SuggestionResponse, AuditResponse, AuditIssue } from '../../server/checklist/checklistAdvisor';
import { formatINR } from '../../utils/currency';

export const ChecklistScreen: React.FC = () => {
  const {
    activeEvent,
    tasks,
    teamMembers,
    categories,
    toggleSubtask,
    updateTaskStatus,
    updateTask,
    addTask,
    addMultipleTasks,
    deleteTask,
    setEventDate,
    setCurrentTab,
    showToast,
  } = useApp();
  const { user, isDemoMode } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedDirectory, setSelectedDirectory] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({
    'task-groom-1': true,
    'task-groom-3': true,
    'task-inv-4': true,
  });

  // Date editing state
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState(activeEvent.eventDate || '');

  // New task form state
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    categoryName: 'Groom',
    categoryId: 'groom',
    subcategoryName: 'Attire & Styling',
    priority: 'medium' as TaskPriority,
    ownerId: '',
    directoryType: 'family' as DirectoryType,
    description: '',
    relativeOffsetDays: -15,
    estimatedCost: 0,
    linkedBudgetCategoryId: '',
  });

  // AI Task Expansion Preview State
  const [expansionLoading, setExpansionLoading] = useState(false);
  const [expansionModalOpen, setExpansionModalOpen] = useState(false);
  const [expansionData, setExpansionData] = useState<SuggestionResponse | null>(null);
  const [selectedCandidateIndices, setSelectedCandidateIndices] = useState<Record<number, boolean>>({});

  // Checklist Audit State
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [auditBannerDismissed, setAuditBannerDismissed] = useState(false);

  // Dependency Management Modal State
  const [depModalTask, setDepModalTask] = useState<TaskItem | null>(null);
  const [depError, setDepError] = useState<string | null>(null);

  const eventTasks = tasks.filter((t) => t.eventId === activeEvent.id);

  // Calculate overall and category leaf task progress
  const leafProgress = ChecklistEngine.calculateLeafProgress(eventTasks);

  // Categories list
  const availableCategories = Array.from(new Set(eventTasks.map((t) => t.categoryName)));

  // Filtered tasks
  const filteredTasks = eventTasks.filter((t) => {
    if (selectedCategory !== 'all' && t.categoryName.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    if (selectedStatus === 'completed' && t.status !== 'completed') return false;
    if (selectedStatus === 'pending' && t.status === 'completed') return false;
    if (selectedStatus === 'high' && t.priority !== 'high') return false;
    if (selectedStatus === 'blocked') {
      const prereqs = ChecklistEngine.evaluatePrerequisites(t, eventTasks);
      if (!prereqs.isBlocked) return false;
    }
    if (selectedOwner !== 'all' && t.ownerId !== selectedOwner) return false;
    if (selectedDirectory !== 'all') {
      const ownerMember = teamMembers.find((m) => m.id === t.ownerId);
      const taskDir = ownerMember?.directoryType || t.directoryType || 'family';
      if (taskDir !== selectedDirectory) return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) || false;
      const matchSub = t.subtasks?.some((st) => st.title.toLowerCase().includes(q)) || false;
      const matchOwner = t.ownerName?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchSub && !matchOwner) return false;
    }
    return true;
  });

  // Group filtered tasks by Subcategory
  const subcategoryGroups: Record<string, TaskItem[]> = {};
  filteredTasks.forEach((t) => {
    const sub = t.subcategoryName || 'General Logistics';
    if (!subcategoryGroups[sub]) {
      subcategoryGroups[sub] = [];
    }
    subcategoryGroups[sub].push(t);
  });

  const toggleTaskExpanded = (id: string) => {
    setExpandedTasks((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
  };

  // Trigger AI Microtask Expansion
  const handleOpenAIExpansion = async (categoryTarget?: string) => {
    const targetCat = categoryTarget || (selectedCategory !== 'all' ? selectedCategory : 'Groom');
    setExpansionLoading(true);
    setExpansionModalOpen(true);
    setExpansionData(null);
    setSelectedCandidateIndices({});

    try {
      const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined;
      const res = await ChecklistClient.requestTaskExpansion({
        eventContext: {
          name: activeEvent.name,
          type: activeEvent.type,
          city: activeEvent.city,
          guestCount: activeEvent.guestCount,
          eventDate: activeEvent.eventDate,
        },
        category: targetCat,
        existingTasks: eventTasks,
        idToken,
      });

      setExpansionData(res);
      // Pre-check non-duplicates
      const initialSelection: Record<number, boolean> = {};
      res.suggestions.forEach((s: any, idx: number) => {
        initialSelection[idx] = !s.isDuplicate;
      });
      setSelectedCandidateIndices(initialSelection);
    } catch (err: any) {
      showToast('Could not load AI task expansion: ' + err.message, 'error');
      setExpansionModalOpen(false);
    } finally {
      setExpansionLoading(false);
    }
  };

  // Confirm and Import Selected AI Tasks
  const handleImportSelectedAITasks = async () => {
    if (!expansionData) return;

    const toAdd = expansionData.suggestions
      .filter((_: any, idx: number) => selectedCandidateIndices[idx])
      .map((s: any) => ({
        eventId: activeEvent.id,
        categoryId: expansionData.category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        categoryName: expansionData.category,
        subcategoryName: s.subcategoryName || 'AI Expansion',
        title: s.title,
        description: s.description ? `${s.description} (Operational rationale: ${s.rationale})` : s.rationale,
        status: 'todo' as TaskStatus,
        priority: s.priority,
        relativeOffsetDays: s.relativeOffsetDays,
        estimatedCost: s.estimatedCost,
        dependsOnIds: [],
        subtasks: [
          {
            id: `st-init-${Date.now()}`,
            title: 'Initial vendor briefing & schedule lock',
            completed: false,
          },
        ],
      }));

    if (toAdd.length === 0) {
      showToast('No tasks selected for import.', 'warning');
      return;
    }

    await addMultipleTasks(toAdd);
    setExpansionModalOpen(false);
    setExpansionData(null);
  };

  // Run Gap / Blindspot Audit
  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const idToken = user ? await user.getIdToken().catch(() => undefined) : undefined;
      const res = await ChecklistClient.requestChecklistAudit({
        eventContext: {
          name: activeEvent.name,
          type: activeEvent.type,
          city: activeEvent.city,
          guestCount: activeEvent.guestCount,
          eventDate: activeEvent.eventDate,
        },
        tasks: eventTasks,
        idToken,
      });
      setAuditData(res);
      setAuditBannerDismissed(false);
      showToast(`Checklist audit complete: Found ${res.totalIssues} operational insights.`, 'info');
    } catch (err: any) {
      showToast('Failed to audit checklist: ' + err.message, 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // Add Task recommended by Audit
  const handleAddAuditRecommendedTask = async (issue: AuditIssue) => {
    await addTask({
      eventId: activeEvent.id,
      categoryId: issue.category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      categoryName: issue.category,
      subcategoryName: 'Critical Safeguard',
      title: issue.title,
      description: `${issue.description} Recommendation: ${issue.recommendation}`,
      status: 'todo',
      priority: issue.severity === 'critical' ? 'high' : 'medium',
      relativeOffsetDays: -14,
      dependsOnIds: [],
      subtasks: [
        {
          id: `st-audit-${Date.now()}`,
          title: issue.recommendation,
          completed: false,
        },
      ],
    });
    // Remove issue from view
    if (auditData) {
      setAuditData({
        ...auditData,
        issues: auditData.issues.filter((i: AuditIssue) => i.id !== issue.id),
        totalIssues: auditData.totalIssues - 1,
      });
    }
  };

  // Create Task Form Handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title.trim()) return;

    const assignedMember = teamMembers.find((m) => m.id === newTaskData.ownerId);

    addTask({
      eventId: activeEvent.id,
      title: newTaskData.title.trim(),
      categoryId: newTaskData.categoryId,
      categoryName: newTaskData.categoryName,
      subcategoryName: newTaskData.subcategoryName,
      status: 'todo',
      priority: newTaskData.priority,
      ownerId: newTaskData.ownerId || undefined,
      ownerName: assignedMember ? assignedMember.name : undefined,
      ownerRole: assignedMember ? assignedMember.relation : undefined,
      relativeOffsetDays: Number(newTaskData.relativeOffsetDays),
      estimatedCost: Number(newTaskData.estimatedCost) || undefined,
      linkedBudgetCategoryId: newTaskData.linkedBudgetCategoryId || undefined,
      dependsOnIds: [],
      subtasks: [
        {
          id: `st-init-${Date.now()}`,
          title: 'Initial setup & vendor confirmation',
          completed: false,
        },
      ],
    });

    setNewTaskModalOpen(false);
    setNewTaskData({
      title: '',
      categoryName: 'Groom',
      categoryId: 'groom',
      subcategoryName: 'Attire & Styling',
      priority: 'medium',
      ownerId: '',
      directoryType: 'family',
      description: '',
      relativeOffsetDays: -15,
      estimatedCost: 0,
      linkedBudgetCategoryId: '',
    });
  };

  // Toggle Dependency in Modal with Cycle Prevention
  const handleToggleDependency = async (candidatePrereqId: string) => {
    if (!depModalTask) return;
    setDepError(null);

    const isCurrentDep = depModalTask.dependsOnIds.includes(candidatePrereqId);
    if (isCurrentDep) {
      // Remove dependency
      const updatedDeps = depModalTask.dependsOnIds.filter((id: string) => id !== candidatePrereqId);
      await updateTask(depModalTask.id, { dependsOnIds: updatedDeps });
      setDepModalTask({ ...depModalTask, dependsOnIds: updatedDeps });
    } else {
      // Check cycle before adding
      const cycleCheck = ChecklistEngine.detectCycle(eventTasks, depModalTask.id, candidatePrereqId);
      if (cycleCheck.hasCycle) {
        setDepError(
          `Cannot link prerequisite: ${cycleCheck.reason || 'Circular dependency graph detected.'}`
        );
        return;
      }
      const updatedDeps = [...depModalTask.dependsOnIds, candidatePrereqId];
      await updateTask(depModalTask.id, { dependsOnIds: updatedDeps });
      setDepModalTask({ ...depModalTask, dependsOnIds: updatedDeps });
    }
  };

  const handleSaveDate = async () => {
    await setEventDate(dateInput);
    setIsEditingDate(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E06D28]">
            <span>Hierarchical Event Execution</span>
            <span className="text-[#231530]/40">·</span>
            <span className="text-[#231530]/60">Strict Dependency Tracking</span>
            <span className="text-[#231530]/40">·</span>
            <span className="text-[#231530]/60">Asia/Kolkata IST Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#231530] font-display">
            Smart Checklist & Timeline Intelligence
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Leaf Completion Badge */}
          <div className="px-3.5 py-2 bg-white border border-[#231530]/10 rounded-xl text-xs font-mono shadow-xs">
            <span className="text-[#231530]/60">Leaf Completion: </span>
            <strong className="text-[#E06D28] font-bold">
              {leafProgress.completedLeaves}/{leafProgress.totalLeaves} ({leafProgress.percentage}%)
            </strong>
          </div>

          {/* AI Gap Audit Button */}
          <button
            onClick={handleRunAudit}
            disabled={auditLoading}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Scan checklist against municipal, power, and accessibility blindspots"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>{auditLoading ? 'Auditing...' : 'Audit Blindspots'}</span>
          </button>

          {/* AI Suggest Microtasks Button */}
          <button
            onClick={() => handleOpenAIExpansion()}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Preview AI recommended microtasks for this category"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI Suggest Tasks</span>
          </button>

          {/* Add Custom Task */}
          <button
            onClick={() => setNewTaskModalOpen(true)}
            className="px-4 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Date Uncertainty & Timezone Status Banner */}
      <div className="p-4 bg-white border border-[#231530]/10 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${activeEvent.eventDate ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              {activeEvent.eventDate ? (
                <div>
                  <span className="text-xs font-bold text-emerald-800">
                    Celebration Date Locked: {ChecklistEngine.calculateMilestoneDate(activeEvent.eventDate, 0, 'Asia/Kolkata').formattedDisplay}
                  </span>
                  <p className="text-[11px] text-[#231530]/65">
                    All milestone deadlines are dynamically calculated relative to this anchor in Indian Standard Time (IST).
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-bold text-amber-800">
                    Celebration Date Unconfirmed (Date Uncertainty Guard Active)
                  </span>
                  <p className="text-[11px] text-[#231530]/65">
                    Tasks are displayed strictly as relative milestones (e.g. T-60 days before event). No arbitrary calendar dates are invented.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#231530]/20 rounded-lg focus:border-[#E06D28] focus:outline-hidden"
                />
                <button
                  onClick={handleSaveDate}
                  className="px-3 py-1.5 bg-[#E06D28] text-white text-xs font-semibold rounded-lg hover:bg-[#C4551D] cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingDate(false)}
                  className="px-2.5 py-1.5 bg-gray-100 text-[#231530]/70 text-xs rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDateInput(activeEvent.eventDate || '');
                  setIsEditingDate(true);
                }}
                className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#231530]/5 text-[#231530] text-xs font-medium border border-[#231530]/15 rounded-lg transition-colors cursor-pointer"
              >
                {activeEvent.eventDate ? 'Change Date' : 'Set Event Date'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Audit Results Banner (if present) */}
      {auditData && !auditBannerDismissed && (
        <div className="bg-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-4 border border-indigo-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Checklist Operational Audit ({auditData.totalIssues} Insights Found)
                </h3>
                <p className="text-[11px] text-indigo-200">
                  {auditData.disclaimer}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAuditBannerDismissed(true)}
              className="text-indigo-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {auditData.issues.map((issue) => (
              <div
                key={issue.id}
                className="bg-indigo-900/60 border border-indigo-700/50 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-indigo-800 text-indigo-200">
                      {issue.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xs ${
                        issue.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white mt-1.5">{issue.title}</h4>
                  <p className="text-[11px] text-indigo-200/90 mt-1 leading-relaxed">{issue.description}</p>
                </div>

                <div className="pt-2 border-t border-indigo-800/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-indigo-300 truncate max-w-[200px]" title={issue.recommendation}>
                    {issue.recommendation}
                  </span>
                  <button
                    onClick={() => handleAddAuditRecommendedTask(issue)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-[#231530] text-[10px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#231530]/10 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#231530]/40 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, catering microtasks, food stalls, owners..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:outline-hidden focus:border-[#E06D28]"
            />
          </div>

          {/* Directory Filter */}
          <select
            value={selectedDirectory}
            onChange={(e) => setSelectedDirectory(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] font-medium"
          >
            <option value="all">All Member Directories</option>
            <option value="family">Family Roster</option>
            <option value="office">Office Colleagues</option>
            <option value="community">Community & Society</option>
            <option value="volunteers">Volunteers & Marshals</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="completed">Completed Only</option>
            <option value="blocked">Blocked by Dependencies</option>
            <option value="high">High Priority Only</option>
          </select>

          {/* Owner filter grouped by directory */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
          >
            <option value="all">All Assigned Leads</option>
            <optgroup label="Family Roster">
              {teamMembers.filter((m) => m.directoryType === 'family').map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
              ))}
            </optgroup>
            <optgroup label="Office Colleagues">
              {teamMembers.filter((m) => m.directoryType === 'office').map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
              ))}
            </optgroup>
            <optgroup label="Community & Society">
              {teamMembers.filter((m) => m.directoryType === 'community').map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
              ))}
            </optgroup>
            <optgroup label="Volunteers & Marshals">
              {teamMembers.filter((m) => m.directoryType === 'volunteers').map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.relation})</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Category Pills with Category Leaf Progress */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#231530] text-white font-semibold'
                : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
            }`}
          >
            All Categories ({eventTasks.length})
          </button>
          {availableCategories.map((catName) => {
            const catProgress = ChecklistEngine.calculateCategoryProgress(eventTasks, catName);
            const isSelected = selectedCategory.toLowerCase() === catName.toLowerCase();
            return (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#E06D28] text-white font-semibold'
                    : 'bg-[#FAF7F2] text-[#231530]/70 hover:text-[#231530]'
                }`}
              >
                <span>{catName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#231530]/10 text-[#231530]/80'
                  }`}
                >
                  {catProgress.completedLeaves}/{catProgress.totalLeaves}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped Hierarchical Task View (by Subcategory) */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-[#231530]/10 rounded-2xl p-12 text-center text-xs text-[#231530]/60">
            No checklist items match your active filters. Try clearing the search or category filters.
          </div>
        ) : (
          Object.entries(subcategoryGroups).map(([subcategoryName, groupTasks]) => (
            <div key={subcategoryName} className="space-y-3">
              {/* Subcategory Section Header */}
              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#E06D28] rounded-full" />
                  <h3 className="text-sm font-bold text-[#231530] uppercase tracking-wider">
                    {subcategoryName}
                  </h3>
                  <span className="text-xs text-[#231530]/50">({groupTasks.length} tasks)</span>
                </div>
              </div>

              {/* Tasks in Subcategory */}
              <div className="space-y-3">
                {groupTasks.map((task) => {
                  const isExpanded = !!expandedTasks[task.id];
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                  const completedSubCount = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0;
                  const prereqs = ChecklistEngine.evaluatePrerequisites(task, eventTasks);
                  const dateInfo = ChecklistEngine.calculateMilestoneDate(activeEvent.eventDate, task.relativeOffsetDays, 'Asia/Kolkata');

                  return (
                    <div
                      key={task.id}
                      className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition-all ${
                        prereqs.isBlocked
                          ? 'border-amber-300/80 bg-amber-50/10'
                          : 'border-[#231530]/10 hover:border-[#231530]/25'
                      }`}
                    >
                      {/* Main Task Header Row */}
                      <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() =>
                            updateTaskStatus(
                              task.id,
                              task.status === 'completed' ? 'todo' : 'completed'
                            )
                          }
                          className="mt-1 w-4 h-4 rounded-md accent-[#E06D28] cursor-pointer shrink-0"
                        />

                        {/* Body Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={`text-sm sm:text-base font-semibold ${
                                task.status === 'completed'
                                  ? 'line-through text-[#231530]/40'
                                  : 'text-[#231530]'
                              }`}
                            >
                              {task.title}
                            </h4>

                            {task.priority === 'high' && (
                              <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200/50 px-1.5 py-0.5 rounded-sm font-semibold uppercase">
                                High Priority
                              </span>
                            )}

                            {/* Prerequisite & Blocked Badges */}
                            {task.dependsOnIds && task.dependsOnIds.length > 0 && (
                              <button
                                onClick={() => setDepModalTask(task)}
                                className={`text-[10px] px-1.5 py-0.5 rounded-sm flex items-center gap-1 font-mono cursor-pointer border ${
                                  prereqs.isBlocked
                                    ? 'text-amber-800 bg-amber-100 border-amber-300 font-bold'
                                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                }`}
                                title="Click to view or edit task prerequisites"
                              >
                                <Link2 className="w-3 h-3" />
                                <span>
                                  {prereqs.isBlocked
                                    ? `Blocked (${prereqs.pendingDependencies.length} pending)`
                                    : `Chained (${prereqs.completedCount}/${prereqs.totalCount})`}
                                </span>
                              </button>
                            )}

                            {/* Estimated Expense Badge */}
                            {task.estimatedCost !== undefined && task.estimatedCost > 0 && (
                              <span
                                className="text-[10px] text-[#231530]/80 bg-[#FAF7F2] border border-[#231530]/10 px-1.5 py-0.5 rounded-sm flex items-center gap-1 font-mono"
                                title="Estimated task operational budget (does not mark invoice paid)"
                              >
                                <Coins className="w-3 h-3 text-[#E06D28]" />
                                <span>{formatINR(task.estimatedCost)}</span>
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs text-[#231530]/70 mt-1 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Blocked Explanation Alert */}
                          {prereqs.isBlocked && (
                            <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                Waiting on prerequisite: <strong>{prereqs.pendingDependencies[0]?.title}</strong>
                              </span>
                            </div>
                          )}

                          {/* Metadata Line */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#231530]/60 mt-2">
                            <span className="font-medium text-[#231530]/80">{task.categoryName}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-[#E06D28]" />
                              <span className="font-medium text-[#231530]">
                                {task.ownerName ? (
                                  <>
                                    <span>{task.ownerName}</span>
                                    {(() => {
                                      const m = teamMembers.find((mem) => mem.id === task.ownerId);
                                      const dir = m?.directoryType || task.directoryType || 'family';
                                      const dirLabels: Record<string, string> = {
                                        family: 'Family',
                                        office: 'Office',
                                        community: 'Community',
                                        volunteers: 'Volunteer',
                                      };
                                      return (
                                        <span className="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-xs bg-[#231530]/10 text-[#231530]/80 uppercase">
                                          {dirLabels[dir] || dir}
                                        </span>
                                      );
                                    })()}
                                  </>
                                ) : (
                                  'Unassigned'
                                )}
                              </span>
                            </span>
                            <span>·</span>
                            {/* Date / Milestone Display */}
                            <span className="flex items-center gap-1 font-mono text-[#231530]/80" title={dateInfo.relativeDaysLabel}>
                              <Clock className="w-3 h-3 text-[#231530]/50" />
                              <span>{dateInfo.formattedDisplay}</span>
                            </span>
                            {hasSubtasks && (
                              <>
                                <span>·</span>
                                <span className="text-[#E06D28] font-semibold">
                                  {completedSubCount}/{task.subtasks.length} Subtasks
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Chain Dependencies Modal button */}
                          <button
                            onClick={() => setDepModalTask(task)}
                            className="p-1.5 text-[#231530]/50 hover:text-[#231530] rounded-lg transition-colors cursor-pointer"
                            title="Manage Task Dependencies"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>

                          {/* AI Expand Task */}
                          <button
                            onClick={() => handleOpenAIExpansion(task.categoryName)}
                            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#E06D28]/10 text-[#231530] hover:text-[#E06D28] border border-[#231530]/10 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            title="Generate granular microtasks for this category"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#E06D28]" />
                            <span>Expand</span>
                          </button>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-[#231530]/40 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {hasSubtasks && (
                            <button
                              onClick={() => toggleTaskExpanded(task.id)}
                              className="p-1.5 text-[#231530]/60 hover:text-[#231530] rounded-lg transition-colors cursor-pointer"
                              title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subtask Hierarchy View */}
                      {hasSubtasks && isExpanded && (
                        <div className="px-6 pb-5 pt-1 bg-[#FAF7F2]/50 border-t border-[#231530]/5 space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#231530]/60 block pt-1">
                            Granular Checklist Microtasks (Leaf Items):
                          </span>
                          <div className="space-y-1.5">
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center gap-2.5 text-xs text-[#231530] p-1.5 hover:bg-white rounded-md transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={st.completed}
                                  onChange={() => toggleSubtask(task.id, st.id)}
                                  className="w-3.5 h-3.5 accent-[#E06D28] rounded-sm cursor-pointer"
                                />
                                <span
                                  className={
                                    st.completed
                                      ? 'line-through text-[#231530]/40'
                                      : 'text-[#231530]'
                                  }
                                >
                                  {st.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Task Expansion Preview Modal */}
      {expansionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231530]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#231530]/10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#231530]/10 flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#231530] font-display">
                    AI Microtask Expansion Preview
                  </h3>
                  <p className="text-xs text-[#231530]/60">
                    Category: <strong className="text-[#E06D28]">{expansionData?.category || '...'}</strong> · Review & select microtasks to import
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExpansionModalOpen(false)}
                className="p-1.5 text-[#231530]/40 hover:text-[#231530] rounded-xl hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {expansionLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-[#231530]">
                    Consulting Utsav AI Cultural Operations Model...
                  </p>
                  <p className="text-xs text-[#231530]/60">
                    Routing request through AI Usage Gateway & deduplicating against existing tasks
                  </p>
                </div>
              ) : expansionData ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                    <span>
                      {expansionData.notes || 'Preview generated successfully.'}
                    </span>
                    {expansionData.duplicateCount > 0 && (
                      <span className="font-semibold text-amber-700">
                        {expansionData.duplicateCount} duplicate(s) unselected by default
                      </span>
                    )}
                  </div>

                  {/* Candidate List */}
                  <div className="space-y-3">
                    {expansionData.suggestions.map((cand: any, idx: number) => {
                      const isChecked = !!selectedCandidateIndices[idx];
                      return (
                        <div
                          key={cand.id}
                          onClick={() =>
                            setSelectedCandidateIndices((prev: Record<number, boolean>) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }))
                          }
                          className={`p-4 border rounded-2xl transition-all cursor-pointer ${
                            isChecked
                              ? 'border-[#E06D28] bg-[#E06D28]/5'
                              : 'border-[#231530]/10 bg-white hover:border-[#231530]/25'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Handled by container click
                              className="mt-1 w-4 h-4 rounded-md accent-[#E06D28] cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-[#231530]">{cand.title}</h4>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-[#FAF7F2] text-[#231530]/70 border border-[#231530]/10">
                                  {cand.subcategoryName}
                                </span>
                                {cand.isDuplicate && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-300">
                                    Already in Checklist
                                  </span>
                                )}
                                {cand.estimatedCost && (
                                  <span className="text-[10px] font-mono text-[#E06D28] font-bold">
                                    ~{formatINR(cand.estimatedCost)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#231530]/70 mt-1 leading-relaxed">
                                {cand.description}
                              </p>
                              {cand.rationale && (
                                <p className="text-[11px] text-purple-900 bg-purple-50/60 rounded-md p-1.5 mt-2">
                                  <strong>Operational Rationale:</strong> {cand.rationale}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#231530]/10 bg-[#FAF7F2] flex items-center justify-between gap-3">
              <button
                onClick={() => setExpansionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#231530]/70 hover:text-[#231530] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Dismiss (Leave Tasks Unchanged)
              </button>

              <button
                disabled={expansionLoading || !expansionData}
                onClick={handleImportSelectedAITasks}
                className="px-5 py-2.5 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Import Selected (
                  {Object.values(selectedCandidateIndices).filter(Boolean).length})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Graph & Prerequisite Manager Modal */}
      {depModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231530]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#231530]/10 overflow-hidden">
            <div className="p-5 border-b border-[#231530]/10 flex items-center justify-between bg-[#FAF7F2]">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#E06D28]" />
                <div>
                  <h3 className="text-sm font-bold text-[#231530]">Prerequisite Dependencies</h3>
                  <p className="text-xs text-[#231530]/60 truncate max-w-[320px]">
                    Task: <strong>{depModalTask.title}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDepModalTask(null);
                  setDepError(null);
                }}
                className="p-1.5 text-[#231530]/40 hover:text-[#231530]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-[#231530]/70">
                Select tasks that must be completed BEFORE <em>"{depModalTask.title}"</em> can begin. The engine automatically rejects cyclic loops.
              </p>

              {depError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{depError}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                {eventTasks
                  .filter((t) => t.id !== depModalTask.id)
                  .map((cand) => {
                    const isLinked = depModalTask.dependsOnIds.includes(cand.id);
                    return (
                      <div
                        key={cand.id}
                        onClick={() => handleToggleDependency(cand.id)}
                        className={`p-3 border rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isLinked
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                            : 'bg-white border-[#231530]/10 hover:border-[#231530]/25 text-[#231530]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate">{cand.title}</span>
                          <span className="text-[10px] text-[#231530]/50 block">
                            {cand.categoryName} · Status: {cand.status}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={() => {}}
                          className="w-4 h-4 accent-[#E06D28] rounded-sm cursor-pointer shrink-0"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="p-4 border-t border-[#231530]/10 bg-[#FAF7F2] flex justify-end">
              <button
                onClick={() => {
                  setDepModalTask(null);
                  setDepError(null);
                }}
                className="px-4 py-2 bg-[#231530] text-white text-xs font-semibold rounded-xl hover:bg-[#341F47] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {newTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#231530]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#231530]/10 overflow-hidden">
            <div className="p-5 border-b border-[#231530]/10 flex items-center justify-between bg-[#FAF7F2]">
              <h3 className="text-base font-bold text-[#231530] font-display">
                Add Custom Checklist Task
              </h3>
              <button
                onClick={() => setNewTaskModalOpen(false)}
                className="p-1.5 text-[#231530]/40 hover:text-[#231530]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#231530] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeEvent.type === 'birthday'
                      ? 'e.g. Order custom themed birthday cake'
                      : activeEvent.type === 'community'
                      ? 'e.g. Finalize municipal ground sound clearance'
                      : 'e.g. Confirm Safa Tying specialist arrival'
                  }
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskData.categoryName}
                    onChange={(e) =>
                      setNewTaskData({
                        ...newTaskData,
                        categoryName: e.target.value,
                        categoryId: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
                  >
                    {activeEvent.type === 'birthday' ? (
                      <>
                        <option value="Theme & Cake">Theme &amp; Cake</option>
                        <option value="Venue & Play Area">Venue &amp; Play Area</option>
                        <option value="Entertainment & Games">Entertainment &amp; Games</option>
                        <option value="Party Favors & Photography">Party Favors &amp; Photography</option>
                        <option value="Catering & Beverages">Catering &amp; Beverages</option>
                        <option value="Invitations">Invitations</option>
                        <option value="General Logistics">General Logistics</option>
                      </>
                    ) : activeEvent.type === 'community' ? (
                      <>
                        <option value="Ground & Venue">Ground &amp; Venue</option>
                        <option value="Audio-Visual & Stage">Audio-Visual &amp; Stage</option>
                        <option value="Permits & Civic">Permits &amp; Civic</option>
                        <option value="Meal & Hospitality">Meal &amp; Hospitality</option>
                        <option value="Volunteers">Volunteers</option>
                        <option value="Communications">Communications</option>
                        <option value="General Logistics">General Logistics</option>
                      </>
                    ) : (
                      <>
                        <option value="Groom">Groom</option>
                        <option value="Bride">Bride</option>
                        <option value="Invitations">Invitations</option>
                        <option value="Catering">Catering</option>
                        <option value="Venue">Venue</option>
                        <option value="Decor">Decor</option>
                        <option value="Photography">Photography</option>
                        <option value="Rituals">Rituals</option>
                        <option value="General Logistics">General Logistics</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={newTaskData.subcategoryName}
                    onChange={(e) => setNewTaskData({ ...newTaskData, subcategoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskData.priority}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, priority: e.target.value as TaskPriority })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Relative Offset (Days)
                  </label>
                  <input
                    type="number"
                    value={newTaskData.relativeOffsetDays}
                    onChange={(e) =>
                      setNewTaskData({ ...newTaskData, relativeOffsetDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Directory & Owner Assignment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Target Member Directory
                  </label>
                  <select
                    value={newTaskData.directoryType}
                    onChange={(e) =>
                      setNewTaskData({
                        ...newTaskData,
                        directoryType: e.target.value as DirectoryType,
                        ownerId: '', // Reset owner on directory change
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] font-medium"
                  >
                    <option value="family">Family Roster</option>
                    <option value="office">Office Colleagues</option>
                    <option value="community">Community Committee</option>
                    <option value="volunteers">Volunteers &amp; Marshals</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#231530]">
                      Assign Task Owner
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewTaskModalOpen(false);
                        setCurrentTab('team');
                      }}
                      className="text-[10px] text-[#E06D28] hover:underline font-semibold cursor-pointer"
                    >
                      + Invite Member
                    </button>
                  </div>
                  <select
                    value={newTaskData.ownerId}
                    onChange={(e) => setNewTaskData({ ...newTaskData, ownerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
                  >
                    <option value="">Unassigned</option>
                    {/* Filter members by selected directoryType first */}
                    {teamMembers.filter((m) => m.directoryType === newTaskData.directoryType).length > 0 ? (
                      teamMembers
                        .filter((m) => m.directoryType === newTaskData.directoryType)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.relation})
                          </option>
                        ))
                    ) : (
                      /* Fallback to all members if none in specific directory */
                      teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.relation})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Estimated Cost (INR)
                  </label>
                  <input
                    type="number"
                    value={newTaskData.estimatedCost}
                    onChange={(e) => setNewTaskData({ ...newTaskData, estimatedCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#231530] mb-1">
                    Link Budget Category
                  </label>
                  <select
                    value={newTaskData.linkedBudgetCategoryId}
                    onChange={(e) => setNewTaskData({ ...newTaskData, linkedBudgetCategoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#231530]/15 rounded-xl focus:border-[#E06D28]"
                  >
                    <option value="">None (Operational)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#231530]/60 hover:text-[#231530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#E06D28] hover:bg-[#C4551D] text-white text-xs font-semibold rounded-xl"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
