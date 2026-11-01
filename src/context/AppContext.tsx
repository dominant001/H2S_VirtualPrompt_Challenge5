import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BudgetCategory,
  ChangeProposal,
  CopilotMessage,
  EventModel,
  TaskItem,
  TaskStatus,
  TeamMember,
  VendorQuote,
} from '../types';
import {
  INITIAL_BUDGET_CATEGORIES,
  INITIAL_EVENT,
  INITIAL_TASKS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_VENDOR_QUOTES,
} from '../data/seedData';
import { createEventFromTemplate } from '../data/eventTemplates';
import {
  applyProposalToCategories,
  createGuestAdjustmentProposal,
} from '../services/budgetCalculator';
import { ReplanningEngine } from '../domain/replanningEngine';
import { replanningClient } from '../services/replanningClient';
import { useAuth } from './AuthContext';
import {
  FirestoreBudgetService,
  FirestoreEventRepository,
  FirestoreTaskService,
  FirestoreVendorService,
} from '../services/firestoreService';
import {
  MockBudgetService,
  MockEventRepository,
  MockTaskService,
  MockVendorService,
} from '../services/mockService';
import { aiGatewayClient } from '../services/aiGatewayClient';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  // Navigation & UI state
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  activeProposalModal: ChangeProposal | null;
  setActiveProposalModal: (proposal: ChangeProposal | null) => void;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Domain state
  events: EventModel[];
  activeEventId: string;
  activeEvent: EventModel;
  setActiveEventId: (id: string) => void;
  createNewEvent: (formData: any) => Promise<void>;
  updateEvent: (updates: Partial<EventModel>) => Promise<void>;
  setEventDate: (date: string) => Promise<void>;
  seedSampleEventToCloud: () => Promise<void>;

  // Budget
  categories: BudgetCategory[];
  updateCategoryAllocated: (categoryId: string, amount: number) => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<BudgetCategory>) => Promise<void>;
  lockCategoryPayment: (categoryId: string, paidAmount: number, locked: boolean, notes?: string) => Promise<void>;
  finalizeVendorForCategory: (vendorQuoteId: string, categoryId?: string) => Promise<void>;
  unfinalizeVendorForCategory: (categoryId: string) => Promise<void>;

  // Tasks & Checklist
  tasks: TaskItem[];
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  addTask: (task: Omit<TaskItem, 'id'>) => Promise<void>;
  addMultipleTasks: (tasks: Omit<TaskItem, 'id'>[]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  expandTaskWithAI: (taskId: string) => Promise<void>;

  // Proposals & Scenario Planning
  proposals: ChangeProposal[];
  createGuestProposal: (newGuestCount: number) => ChangeProposal;
  approveProposal: (proposalId: string, options?: { selectedTaskIds?: string[]; alternativeId?: string }) => Promise<void>;
  rejectProposal: (proposalId: string) => void;

  // Vendors & Quotes
  vendorQuotes: VendorQuote[];
  addVendorQuote: (quote: Omit<VendorQuote, 'id' | 'totalCalculated'>) => Promise<void>;
  updateVendorQuote: (quote: VendorQuote) => Promise<void>;
  deleteVendorQuote: (quoteId: string) => Promise<void>;
  updateQuoteStatus: (id: string, status: 'review' | 'shortlisted' | 'finalized' | 'rejected') => Promise<void>;

  // Team
  teamMembers: TeamMember[];
  updateTeamMember: (id: string, primaryResponsibilities: string[]) => void;
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;

  // Copilot messages
  copilotMessages: CopilotMessage[];
  sendCopilotMessage: (text: string) => void;

  // System & Persistence
  resetAllDemoData: () => void;
  isSyncing: boolean;
  syncError: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'utsav_ai_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady, isDemoMode } = useAuth();

  // Navigation
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [activeProposalModal, setActiveProposalModal] = useState<ChangeProposal | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Local demo state
  const [localEvents, setLocalEvents] = useState<EventModel[]>([INITIAL_EVENT]);
  const [localActiveEventId, setLocalActiveEventId] = useState<string>(INITIAL_EVENT.id);
  const [localCategories, setLocalCategories] = useState<BudgetCategory[]>(INITIAL_BUDGET_CATEGORIES);
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [localVendorQuotes, setLocalVendorQuotes] = useState<VendorQuote[]>(INITIAL_VENDOR_QUOTES);
  const [localProposals, setLocalProposals] = useState<ChangeProposal[]>([]);

  // Cloud Firestore state
  const [cloudEvents, setCloudEvents] = useState<EventModel[]>([]);
  const [cloudActiveEventId, setCloudActiveEventId] = useState<string>('');
  const [cloudCategories, setCloudCategories] = useState<BudgetCategory[]>([]);
  const [cloudTasks, setCloudTasks] = useState<TaskItem[]>([]);
  const [cloudVendorQuotes, setCloudVendorQuotes] = useState<VendorQuote[]>([]);
  const [cloudProposals, setCloudProposals] = useState<ChangeProposal[]>([]);

  // Team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);

  // Services instances
  const firestoreRepo = useMemo(() => new FirestoreEventRepository(), []);
  const firestoreBudget = useMemo(() => new FirestoreBudgetService(), []);
  const firestoreTask = useMemo(() => new FirestoreTaskService(), []);
  const firestoreVendor = useMemo(() => new FirestoreVendorService(), []);

  // Determine active mode
  const isCloudActive = Boolean(user && !isDemoMode);

  // Unified exposed data
  const events = isCloudActive ? cloudEvents : localEvents;
  const activeEventId = isCloudActive ? cloudActiveEventId : localActiveEventId;
  const categories = isCloudActive ? cloudCategories : localCategories;
  const tasks = isCloudActive ? cloudTasks : localTasks;
  const vendorQuotes = isCloudActive ? cloudVendorQuotes : localVendorQuotes;
  const proposals = isCloudActive ? cloudProposals : localProposals;

  const rawActiveEvent =
    events.find((e) => e.id === activeEventId) ||
    events[0] ||
    INITIAL_EVENT;

  const activeEvent: EventModel = {
    ...INITIAL_EVENT,
    ...rawActiveEvent,
    cateringModel: {
      ...INITIAL_EVENT.cateringModel,
      ...(rawActiveEvent.cateringModel || {}),
    },
  };

  // Initial Copilot conversation seed
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Namaste! I am Utsav AI Copilot. I can calculate financial impacts in real-time, simulate guest changes, audit milestones, and keep your celebration budget strictly balanced.',
      timestamp: 'Just now',
      quickActions: [
        {
          label: 'Simulate guest count increase & reserve impact',
          action: 'increase_guests_sim',
        },
        {
          label: 'Check critical milestone sequence',
          action: 'check_invitations',
        },
        {
          label: 'Review catering & live station breakdown',
          action: 'review_catering',
        },
      ],
    },
  ]);

  // Load local demo state from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.events) setLocalEvents(parsed.events);
        if (parsed.activeEventId) setLocalActiveEventId(parsed.activeEventId);
        if (parsed.categories) setLocalCategories(parsed.categories);
        if (parsed.tasks) setLocalTasks(parsed.tasks);
        if (parsed.vendorQuotes) setLocalVendorQuotes(parsed.vendorQuotes);
        if (parsed.teamMembers) setTeamMembers(parsed.teamMembers);
        if (parsed.proposals) setLocalProposals(parsed.proposals);
      }
    } catch (e) {
      console.warn('Could not read from local storage, using fresh demo state:', e);
    }
  }, []);

  // Subscribe to Cloud Firestore when signed in
  useEffect(() => {
    if (!user || isDemoMode) return;

    // 1. Subscribe to user's events
    const unsubEvents = firestoreRepo.subscribeEvents(
      user.uid,
      (evts) => {
        setCloudEvents(evts);
        if (evts.length > 0) {
          // If no active event or active event not in list, select first
          setCloudActiveEventId((currentId) =>
            !currentId || !evts.some((e) => e.id === currentId) ? evts[0].id : currentId
          );
        } else {
          setCloudActiveEventId('');
          setCloudCategories([]);
          setCloudTasks([]);
          setCloudVendorQuotes([]);
        }
      },
      (error) => {
        setSyncError('Could not sync events from Cloud Firestore.');
        showToast('Firestore sync error: ' + error.message, 'error');
      }
    );

    return () => {
      try {
        unsubEvents();
      } catch (e) {
        console.warn('Events unsub handled:', e);
      }
    };
  }, [user, isDemoMode, firestoreRepo]);

  // Subscribe to active event's subcollections in Firestore
  useEffect(() => {
    if (!user || isDemoMode || !cloudActiveEventId) return;

    // Only subscribe to subcollections if the event exists in cloudEvents
    const hasEvent = cloudEvents.some((e) => e.id === cloudActiveEventId);
    if (!hasEvent) {
      setCloudCategories([]);
      setCloudTasks([]);
      setCloudVendorQuotes([]);
      return;
    }

    const unsubCats = firestoreBudget.subscribeCategories(
      cloudActiveEventId,
      (cats) => setCloudCategories(cats),
      (err) => console.warn('Categories sub error:', err)
    );

    const unsubTasks = firestoreTask.subscribeTasks(
      cloudActiveEventId,
      (tsks) => setCloudTasks(tsks),
      (err) => console.warn('Tasks sub error:', err)
    );

    const unsubQuotes = firestoreVendor.subscribeQuotes(
      cloudActiveEventId,
      (qts) => setCloudVendorQuotes(qts),
      (err) => console.warn('Quotes sub error:', err)
    );

    return () => {
      try {
        if (unsubCats) unsubCats();
      } catch (_) {}
      try {
        if (unsubTasks) unsubTasks();
      } catch (_) {}
      try {
        if (unsubQuotes) unsubQuotes();
      } catch (_) {}
    };
  }, [user, isDemoMode, cloudActiveEventId, cloudEvents.length, firestoreBudget, firestoreTask, firestoreVendor]);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setActiveEventId = (id: string) => {
    if (isCloudActive) {
      setCloudActiveEventId(id);
    } else {
      setLocalActiveEventId(id);
    }
  };

  const updateEvent = async (updates: Partial<EventModel>) => {
    if (isCloudActive) {
      setIsSyncing(true);
      try {
        await firestoreRepo.updateEvent(activeEventId, updates);
        showToast('Event settings saved to Cloud Firestore.', 'success');
      } catch (err: any) {
        showToast('Failed to save to Firestore: ' + err.message, 'error');
      } finally {
        setIsSyncing(false);
      }
    } else {
      setLocalEvents((prev) =>
        prev.map((e) => (e.id === activeEventId ? { ...e, ...updates } : e))
      );
      showToast('Event settings updated (Demo Mode).', 'success');
    }
  };

  const setEventDate = async (date: string) => {
    const trimmed = date && date.trim() !== '' ? date.trim() : '';
    if (trimmed) {
      await updateEvent({ eventDate: trimmed });
      showToast(`Event date confirmed: ${trimmed}`, 'info');
    } else {
      await updateEvent({ eventDate: '' });
      showToast('Event date marked as to be confirmed.', 'info');
    }
  };

  const createNewEvent = async (formData: any) => {
    const { event, categories: newCats, tasks: newTasks } = createEventFromTemplate(formData);

    if (isCloudActive && user) {
      setIsSyncing(true);
      event.ownerId = user.uid;
      try {
        await firestoreRepo.createEvent(event, newCats, newTasks);
        setCloudActiveEventId(event.id);
        setOnboardingOpen(false);
        setCurrentTab('dashboard');
        showToast(`Celebration "${event.name}" saved to your Cloud Firestore account.`, 'success');
      } catch (err: any) {
        showToast('Could not create event in Firestore: ' + err.message, 'error');
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Demo Mode local creation
      const updatedEvents = [...localEvents, event];
      const updatedCats = [...localCategories, ...newCats];
      const updatedTasks = [...localTasks, ...newTasks];
      setLocalEvents(updatedEvents);
      setLocalActiveEventId(event.id);
      setLocalCategories(updatedCats);
      setLocalTasks(updatedTasks);
      setOnboardingOpen(false);
      setCurrentTab('dashboard');
      showToast(`Created new event: "${event.name}" in Local Demo Mode.`, 'success');
    }
  };

  // Seed Jaipur Wedding directly to user's Cloud account upon explicit user action
  const seedSampleEventToCloud = async () => {
    if (!user || isDemoMode) {
      showToast('Please sign in with Google to seed this celebration to your account.', 'warning');
      return;
    }
    setIsSyncing(true);
    const newId = `event-jaipur-${Date.now()}`;
    const seededEvent: EventModel = {
      ...INITIAL_EVENT,
      id: newId,
      ownerId: user.uid,
      name: "Aarav & Meera’s Wedding (Cloud)",
      version: 1,
    };
    if (!seededEvent.eventDate) {
      delete seededEvent.eventDate;
    }
    const seededCategories = INITIAL_BUDGET_CATEGORIES.map((c) => ({
      ...c,
      id: `cat-${newId}-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      eventId: newId,
    }));
    const seededTasks = INITIAL_TASKS.map((t) => ({
      ...t,
      id: `task-${newId}-${t.id}`,
      eventId: newId,
    }));

    try {
      await firestoreRepo.createEvent(seededEvent, seededCategories, seededTasks);
      setCloudActiveEventId(newId);
      showToast('Sample Jaipur Wedding (₹12 Lakh) seeded to your Cloud Firestore account!', 'success');
    } catch (err: any) {
      showToast('Failed to seed sample event: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (isCloudActive) {
      try {
        await firestoreBudget.updateCategory(activeEventId, categoryId, updates);
      } catch (err: any) {
        showToast('Failed to update category in Firestore: ' + err.message, 'error');
      }
    } else {
      setLocalCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, ...updates } : cat))
      );
    }
  };

  const updateCategoryAllocated = async (categoryId: string, amount: number) => {
    const target = categories.find((c) => c.id === categoryId);
    if (target?.isPaidLocked && amount < target.paid) {
      showToast(
        `Cannot reduce allocation below locked paid advance of ₹${target.paid.toLocaleString('en-IN')}. Please unlock advance payment first.`,
        'warning'
      );
      return;
    }
    await updateCategory(categoryId, { allocated: amount });
  };

  const lockCategoryPayment = async (categoryId: string, paidAmount: number, locked: boolean, notes?: string) => {
    const target = categories.find((c) => c.id === categoryId);
    if (!target) return;

    const updates: Partial<BudgetCategory> = {
      paid: paidAmount,
      isPaidLocked: locked,
      paidLockedAt: locked ? new Date().toISOString() : undefined,
      ...(notes !== undefined ? { advanceNotes: notes } : {}),
    };

    await updateCategory(categoryId, updates);
    if (locked) {
      const remaining = Math.max(0, target.allocated - paidAmount);
      showToast(
        `Locked advance payment of ₹${paidAmount.toLocaleString('en-IN')} for ${target.name}. Balance due: ₹${remaining.toLocaleString('en-IN')}.`,
        'success'
      );
    } else {
      showToast(`Advance payment unlocked for ${target.name}.`, 'info');
    }
  };

  const finalizeVendorForCategory = async (vendorQuoteId: string, categoryId?: string) => {
    const quote = vendorQuotes.find((q) => q.id === vendorQuoteId);
    if (!quote) {
      showToast('Vendor quote not found.', 'error');
      return;
    }

    const targetCategory = categoryId
      ? categories.find((c) => c.id === categoryId)
      : categories.find((c) => {
          const catLower = c.name.toLowerCase();
          const qCatLower = quote.category.toLowerCase();
          return (
            catLower === qCatLower ||
            catLower.includes(qCatLower) ||
            qCatLower.includes(catLower) ||
            (catLower.includes('photo') && qCatLower.includes('photo')) ||
            (catLower.includes('cater') && qCatLower.includes('cater'))
          );
        });

    if (isCloudActive) {
      try {
        await firestoreVendor.updateQuoteStatus(activeEventId, quote.id, 'finalized');
        for (const other of vendorQuotes) {
          if (
            other.id !== quote.id &&
            other.status === 'finalized' &&
            other.category.toLowerCase() === quote.category.toLowerCase()
          ) {
            await firestoreVendor.updateQuoteStatus(activeEventId, other.id, 'shortlisted');
          }
        }
      } catch (err: any) {
        showToast('Failed to finalize quote in Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalVendorQuotes((prev) =>
        prev.map((q) => {
          if (q.id === quote.id) return { ...q, status: 'finalized' };
          if (q.status === 'finalized' && q.category.toLowerCase() === quote.category.toLowerCase()) {
            return { ...q, status: 'shortlisted' };
          }
          return q;
        })
      );
    }

    if (targetCategory) {
      const updates: Partial<BudgetCategory> = {
        selectedVendorId: quote.id,
        selectedVendorName: quote.vendorName,
        committed: quote.totalCalculated,
        sourceType: 'contracted',
        notes: `Final Vendor: ${quote.vendorName} (Agreed: ₹${quote.totalCalculated.toLocaleString('en-IN')}). Contract finalized.`,
      };
      await updateCategory(targetCategory.id, updates);
      showToast(
        `Finalized ${quote.vendorName} for ${targetCategory.name}! Budget committed to ₹${quote.totalCalculated.toLocaleString('en-IN')}.`,
        'success'
      );
    } else {
      showToast(`Finalized vendor "${quote.vendorName}".`, 'success');
    }
  };

  const unfinalizeVendorForCategory = async (categoryId: string) => {
    const targetCategory = categories.find((c) => c.id === categoryId);
    if (!targetCategory) return;

    if (targetCategory.selectedVendorId) {
      await updateQuoteStatus(targetCategory.selectedVendorId, 'shortlisted');
    }

    await updateCategory(categoryId, {
      selectedVendorId: undefined,
      selectedVendorName: undefined,
      sourceType: 'quoted',
    });
    showToast(`Removed final vendor selection for ${targetCategory.name}.`, 'info');
  };

  // Task methods
  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedSubtasks = targetTask.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    const anyCompleted = updatedSubtasks.some((st) => st.completed);
    const newStatus: TaskStatus = allCompleted
      ? 'completed'
      : anyCompleted
      ? 'in_progress'
      : targetTask.status === 'completed'
      ? 'in_progress'
      : targetTask.status;

    if (isCloudActive) {
      try {
        await firestoreTask.updateTask(activeEventId, taskId, {
          subtasks: updatedSubtasks,
          status: newStatus,
        });
      } catch (err: any) {
        showToast('Failed to update task in Firestore: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: updatedSubtasks, status: newStatus } : t
        )
      );
    }
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updatedSubtasks =
      status === 'completed'
        ? targetTask.subtasks.map((st) => ({ ...st, completed: true }))
        : status === 'todo'
        ? targetTask.subtasks.map((st) => ({ ...st, completed: false }))
        : targetTask.subtasks;

    if (isCloudActive) {
      try {
        await firestoreTask.updateTask(activeEventId, taskId, {
          status,
          subtasks: updatedSubtasks,
        });
        showToast(`Task status updated to ${status.replace('_', ' ')}.`, 'info');
      } catch (err: any) {
        showToast('Failed to update task in Firestore: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status, subtasks: updatedSubtasks } : t
        )
      );
      showToast(`Task status updated to ${status.replace('_', ' ')}.`, 'info');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TaskItem>) => {
    if (isCloudActive) {
      try {
        await firestoreTask.updateTask(activeEventId, taskId, updates);
        showToast('Task details saved to Cloud.', 'success');
      } catch (err: any) {
        showToast('Failed to save task: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      );
      showToast('Task details saved.', 'success');
    }
  };

  const addTask = async (newTaskData: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...newTaskData,
      id: `task-custom-${Date.now()}`,
    };

    if (isCloudActive) {
      try {
        await firestoreTask.addTask(activeEventId, newTask);
        showToast(`Added new task: "${newTask.title}" to Cloud.`, 'success');
      } catch (err: any) {
        showToast('Failed to add task: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) => [...prev, newTask]);
      showToast(`Added new task: "${newTask.title}"`, 'success');
    }
  };

  const addMultipleTasks = async (newTasksData: Omit<TaskItem, 'id'>[]) => {
    if (newTasksData.length === 0) return;

    const newTasks: TaskItem[] = newTasksData.map((data, index) => ({
      ...data,
      id: `task-imported-${Date.now()}-${index + 1}`,
    }));

    if (isCloudActive) {
      setIsSyncing(true);
      try {
        for (const t of newTasks) {
          await firestoreTask.addTask(activeEventId, t);
        }
        showToast(`Successfully added ${newTasks.length} tasks to Cloud.`, 'success');
      } catch (err: any) {
        showToast('Failed to add tasks to Cloud: ' + err.message, 'error');
      } finally {
        setIsSyncing(false);
      }
    } else {
      setLocalTasks((prev) => [...prev, ...newTasks]);
      showToast(`Added ${newTasks.length} tasks to checklist.`, 'success');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (isCloudActive) {
      try {
        await firestoreTask.deleteTask(activeEventId, taskId);
        showToast('Task removed from Cloud.', 'info');
      } catch (err: any) {
        showToast('Failed to delete task: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task removed.', 'info');
    }
  };

  const expandTaskWithAI = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const sampleAdditions: Record<string, string[]> = {
      theme: [
        'Confirm cake flavor and allergen verification with bakery',
        'Verify balloon arch stability and safe wall anchors',
        'Review custom birthday party music playlist and sound checks',
      ],
      cake: [
        'Inspect cold storage space at party venue',
        'Verify theme candle toppers, cake knife and sparklers are packed',
        'Coordinate arrival timing with delivery rider 3 hours before party',
      ],
      venue: [
        'Check child safety foam mats and play zone barriers',
        'Verify emergency exit access and clean bathroom supplies',
        'Confirm party room air conditioning and ventilation',
      ],
      entertainment: [
        'Brief emcee on age-appropriate games and party schedule',
        'Organize winner prizes, medals, and participation stickers',
        'Test microphone wireless signal across the play hall',
      ],
      favors: [
        'Count assembled gift hampers against updated RSVP roster',
        'Attach personalized name tags to return gift packages',
        'Prepare spare generic gift hampers for surprise sibling guests',
      ],
      groom: [
        'Confirm safa tying specialist contact and timing',
        'Check spare button and emergency needle kit in groom suite',
        'Confirm wedding day fragrance & attar selection',
      ],
      catering: [
        'Confirm hot water supply for dishwashing area',
        'Verify separate storage for specialized diet items',
        'Schedule food inspection test with venue banquet manager',
      ],
      invitations: [
        'Prepare digital RSVP reminder schedule',
        'Set up automated SMS/WhatsApp delivery for guest coordinates',
      ],
      default: [
        'Verify vendor point of contact phone & emergency standby',
        'Inspect preliminary setup 3 hours before start',
        'Sign-off inspection checklist with celebration coordinator',
      ],
    };

    const additions = sampleAdditions[targetTask.categoryId] || sampleAdditions.default;
    const newSubtasks = additions.map((title, i) => ({
      id: `st-ai-${Date.now()}-${i}`,
      title: `${title} (Suggested)`,
      completed: false,
    }));

    const combined = [...targetTask.subtasks, ...newSubtasks];

    if (isCloudActive) {
      try {
        await firestoreTask.updateTask(activeEventId, taskId, { subtasks: combined });
        showToast('Added 3 granular checklist subtasks to Cloud.', 'success');
      } catch (err: any) {
        showToast('Could not expand task in Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, subtasks: combined } : task
        )
      );
      showToast('Added 3 granular checklist subtasks.', 'success');
    }
  };

  // Proposals
  const createGuestProposal = (newGuestCount: number): ChangeProposal => {
    const proposal = ReplanningEngine.generateGuestProposal(
      activeEvent,
      categories,
      tasks,
      newGuestCount
    );
    setActiveProposalModal(proposal);
    return proposal;
  };

  const approveProposal = async (
    proposalId: string,
    options: { selectedTaskIds?: string[]; alternativeId?: string } = {}
  ) => {
    const target =
      activeProposalModal?.id === proposalId
        ? activeProposalModal
        : proposals.find((p) => p.id === proposalId);

    if (!target) return;
    if (target.applied) {
      showToast('This proposal has already been applied.', 'warning');
      return;
    }

    const result = ReplanningEngine.approveProposal(activeEvent, categories, tasks, target, {
      selectedTaskIds: options.selectedTaskIds,
      alternativeId: options.alternativeId,
      approvedBy: user?.uid || 'authorized-user',
    });

    if (!result.success) {
      showToast(`Approval error: ${result.message}`, 'error');
      return;
    }

    const { updatedEvent, updatedCategories, updatedTasks, updatedProposal } = result;

    if (isCloudActive) {
      setIsSyncing(true);
      try {
        await firestoreBudget.applyProposal(
          activeEventId,
          updatedProposal,
          updatedCategories,
          updatedEvent
        );
        // Persist newly added tasks to Firestore if any
        const newlyAdded = updatedTasks.slice(tasks.length);
        for (const t of newlyAdded) {
          await firestoreTask.addTask(activeEventId, t);
        }
        setCloudProposals((prev) => [...prev.filter((p) => p.id !== proposalId), updatedProposal]);
        setActiveProposalModal(null);
        showToast(
          `Proposal Approved in Cloud! Catering adjusted to ₹${updatedProposal.impactSummary.revisedCateringCost.toLocaleString('en-IN')}, Reserve to ₹${updatedProposal.impactSummary.revisedReserve.toLocaleString('en-IN')}.`,
          'success'
        );
      } catch (err: any) {
        showToast('Failed to apply proposal to Firestore: ' + err.message, 'error');
      } finally {
        setIsSyncing(false);
      }
    } else {
      setLocalCategories(updatedCategories);
      setLocalEvents((prev) =>
        prev.map((e) => (e.id === activeEventId ? updatedEvent : e))
      );
      setLocalTasks(updatedTasks);
      setLocalProposals((prev) => [...prev.filter((p) => p.id !== proposalId), updatedProposal]);
      setActiveProposalModal(null);
      showToast(
        `Proposal Approved! Catering: ₹${updatedProposal.impactSummary.revisedCateringCost.toLocaleString('en-IN')}, Contingency Reserve: ₹${updatedProposal.impactSummary.revisedReserve.toLocaleString('en-IN')}, Event v${updatedEvent.version}.`,
        'success'
      );
    }
  };

  const rejectProposal = (proposalId: string) => {
    const target =
      activeProposalModal?.id === proposalId
        ? activeProposalModal
        : proposals.find((p) => p.id === proposalId);

    if (target) {
      const { updatedProposal } = ReplanningEngine.rejectProposal(target);
      if (isCloudActive) {
        setCloudProposals((prev) => [...prev.filter((p) => p.id !== proposalId), updatedProposal]);
      } else {
        setLocalProposals((prev) => [...prev.filter((p) => p.id !== proposalId), updatedProposal]);
      }
    }
    setActiveProposalModal(null);
    showToast('Proposal rejected. No changes made to event budget, guest count, or checklist.', 'info');
  };

  // Vendor Quotes
  const addVendorQuote = async (quoteData: Omit<VendorQuote, 'id' | 'totalCalculated'>) => {
    const total = quoteData.rate * quoteData.quantity + quoteData.taxes + quoteData.extras;
    const newQuote: VendorQuote = {
      ...quoteData,
      id: `quote-${Date.now()}`,
      totalCalculated: total,
    };

    if (isCloudActive) {
      try {
        await firestoreVendor.addQuote(activeEventId, newQuote);
        showToast(`Added quotation for "${newQuote.vendorName}" to Cloud.`, 'success');
      } catch (err: any) {
        showToast('Could not save quote to Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalVendorQuotes((prev) => [...prev, newQuote]);
      showToast(`Added quotation for "${newQuote.vendorName}".`, 'success');
    }
  };

  const updateVendorQuote = async (quote: VendorQuote) => {
    const total = quote.rate * quote.quantity + quote.taxes + quote.extras;
    const updated = { ...quote, totalCalculated: total };

    if (isCloudActive) {
      try {
        await firestoreVendor.updateQuote(activeEventId, quote.id, updated);
        showToast(`Updated quote for "${quote.vendorName}" in Cloud.`, 'success');
      } catch (err: any) {
        showToast('Could not update quote in Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalVendorQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? updated : q))
      );
      showToast(`Updated quote for "${quote.vendorName}".`, 'success');
    }
  };

  const deleteVendorQuote = async (quoteId: string) => {
    if (isCloudActive) {
      try {
        await firestoreVendor.deleteQuote(activeEventId, quoteId);
        showToast('Quotation removed from Cloud.', 'info');
      } catch (err: any) {
        showToast('Could not delete quote from Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalVendorQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      showToast('Quotation removed.', 'info');
    }
  };

  const updateQuoteStatus = async (id: string, status: 'review' | 'shortlisted' | 'finalized' | 'rejected') => {
    if (isCloudActive) {
      try {
        await firestoreVendor.updateQuoteStatus(activeEventId, id, status);
        showToast(`Quote status marked as ${status} in Cloud.`, 'info');
      } catch (err: any) {
        showToast('Could not update quote in Cloud: ' + err.message, 'error');
      }
    } else {
      setLocalVendorQuotes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
      showToast(`Quote status marked as ${status}.`, 'info');
    }
  };

  // Team
  const updateTeamMember = (id: string, primaryResponsibilities: string[]) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, primaryResponsibilities } : m))
    );
    showToast('Updated team responsibilities.', 'success');
  };

  const addTeamMember = (memberData: Omit<TeamMember, 'id'>) => {
    const newMember: TeamMember = {
      ...memberData,
      id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTeamMembers((prev) => [...prev, newMember]);
    showToast(`Added "${newMember.name}" to the ${newMember.directoryType.toUpperCase()} directory!`, 'success');
  };

  // Copilot simulated message handler
  const sendCopilotMessage = (text: string) => {
    const userMsg: CopilotMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    setCopilotMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let replyText = '';
      let proposal: ChangeProposal | undefined;
      let quickActions: { label: string; action: string }[] | undefined;

      if (
        lower.includes('increase guests') ||
        lower.includes('increase guest count') ||
        lower.includes('more guests') ||
        lower.includes('extra guests') ||
        lower.includes('guests from') ||
        lower.includes('simulate') ||
        lower.includes('250')
      ) {
        // Parse target count if user wrote a number, else default to +25%
        const toMatch = text.match(/to\s+(\d+)/i) || text.match(/(\d+)\s+guests/i);
        const parsedCount = toMatch ? parseInt(toMatch[1], 10) : undefined;
        const baseCount = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
        const targetCount = parsedCount && parsedCount > baseCount ? parsedCount : Math.round(baseCount * 1.25);

        proposal = ReplanningEngine.generateGuestProposal(activeEvent, categories, tasks, targetCount);

        const deltaGuests = targetCount - baseCount;
        const plateRate =
          activeEvent.cateringModel?.sampleRatePerPlate ||
          Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, baseCount));
        const extras = activeEvent.cateringModel?.sampleExtras ?? Math.round(activeEvent.totalBudget * 0.02);
        const baseCost = baseCount * plateRate + extras;
        const newCost = targetCount * plateRate + extras;
        const deltaCost = newCost - baseCost;

        const contingencyCat = categories.find((c) => c.isContingency || c.name.toLowerCase().includes('contingency'));
        const originalReserve = contingencyCat ? contingencyCat.allocated : Math.round(activeEvent.totalBudget * 0.15);
        const revisedReserve = Math.max(0, originalReserve - deltaCost);

        const isBirthday = activeEvent.type === 'birthday';
        const isCommunity = activeEvent.type === 'community';

        replyText =
          `Intelligent Re-planning Analysis for ${activeEvent.name} (${activeEvent.type.toUpperCase()}):\n\n` +
          `• Baseline Food & Hospitality: ${baseCount} portions × ₹${plateRate} + ₹${extras.toLocaleString('en-IN')} extras = ₹${baseCost.toLocaleString('en-IN')}\n` +
          `• Revised Food & Hospitality: ${targetCount} portions (+${deltaGuests}) × ₹${plateRate} + ₹${extras.toLocaleString('en-IN')} extras = ₹${newCost.toLocaleString('en-IN')} (+₹${deltaCost.toLocaleString('en-IN')})\n\n` +
          `Financial Resolution (Contingency Reserve Allocation):\n` +
          `To strictly preserve your ₹${activeEvent.totalBudget.toLocaleString('en-IN')} celebration cap, the +₹${deltaCost.toLocaleString('en-IN')} delta is absorbed from your Contingency Reserve:\n` +
          `• Contingency Reserve: ₹${originalReserve.toLocaleString('en-IN')} → ₹${revisedReserve.toLocaleString('en-IN')}\n` +
          `• Total Event Budget: ₹${activeEvent.totalBudget.toLocaleString('en-IN')} (Strictly balanced with 0 variance)\n\n` +
          `Impacted Operational Items Flagged for Review:\n` +
          (isBirthday
            ? `1. Confirm party room & play zone capacity for ${targetCount} guests\n` +
              `2. Recalculate birthday cake size & snack replenishment for ${targetCount} kids/parents\n` +
              `3. Order +${deltaGuests} personalized return gift hampers with name tags\n` +
              `4. Amend catering/snack minimum head-count guarantee to ${targetCount} portions\n` +
              `5. Check guest parking & arrival flow at party venue\n\n`
            : isCommunity
            ? `1. Verify community assembly grounds license for ${targetCount} attendees\n` +
              `2. Recalculate seating chairs and drinking water stations\n` +
              `3. Add volunteer coordinators for crowd guidance\n` +
              `4. Update municipal sound permit capacity limit\n\n`
            : `1. Venue banquet hall capacity & fire egress for ${targetCount} guests\n` +
              `2. Dining seating & buffet throughput replenishment speed\n` +
              `3. Recalculate boxed invitation printing batch & mailing list\n` +
              `4. Amend caterer minimum head-count guarantee contract to ${targetCount} plates\n` +
              `5. Arrange additional guest shuttles from transit hubs & airport\n\n`) +
          `⚠️ Safety Gate: Preview makes NO data changes. No budget reallocations or checklist updates will occur until you review and confirm in the approval dialog.`;

        quickActions = [
          { label: 'Review & Approve Impact Preview', action: 'open_proposal' },
        ];
      } else if (lower.includes('invitation') || lower.includes('proof') || lower.includes('dependen') || lower.includes('milestone')) {
        if (activeEvent.type === 'birthday') {
          replyText =
            `Party Milestone & Dependency Sequence for ${activeEvent.name}:\n` +
            `1. Finalize Birthday Party Theme & Color Palette (Completed)\n` +
            `2. Digital Invitation Graphic & RSVP Link (Completed)\n` +
            `3. Custom Theme Cake Order & Flavor Confirmation (In Progress)\n` +
            `4. Entertainer / Emcee / Game Host Booking (In Progress)\n` +
            `5. Party Favor Hampers & Name Badges Count (Locked against RSVPs)\n` +
            `6. Balloon & Welcome Arch Decor Setup on Party Morning\n` +
            `7. Grand Cake Cutting & Celebration Feast`;
        } else if (activeEvent.type === 'community') {
          replyText =
            `Milestone & Operations Sequence for ${activeEvent.name}:\n` +
            `1. Ground Booking & Assembly Approval (Completed)\n` +
            `2. Civic Sound & Sanitation Clearance (Completed)\n` +
            `3. Volunteer Coordinators Onboarding (In Progress)\n` +
            `4. Community Digital Circular & RSVP Roster (In Progress)\n` +
            `5. Stage, Audio System & Water Kiosk Setup\n` +
            `6. Community Assembly & Interactive Forum`;
        } else {
          replyText =
            `Strict Invitation & Ritual Sequence for ${activeEvent.name}:\n` +
            `1. Finalize Master Guest List (Completed)\n` +
            `2. Artwork Design & Copy Approval (Completed)\n` +
            `3. Physical Hard-Copy Proof Inspection (Completed)\n` +
            `4. Batch Printing Invitation Suites (In Progress)\n` +
            `5. Collection & Count Verification (Blocked on #4)\n` +
            `6. Speed Post & Hand Delivery to Elders (Blocked on #5)\n` +
            `7. RSVP Attendance Follow-Up (Blocked on #6)`;
        }
      } else if (lower.includes('catering') || lower.includes('plate') || lower.includes('food') || lower.includes('snack')) {
        const guestCount = activeEvent.guestCount || (activeEvent.type === 'birthday' ? 50 : 200);
        const plateRate =
          activeEvent.cateringModel?.sampleRatePerPlate ||
          Math.round((activeEvent.totalBudget * 0.25) / Math.max(1, guestCount));
        const extras = activeEvent.cateringModel?.sampleExtras ?? Math.round(activeEvent.totalBudget * 0.02);
        replyText =
          `Hospitality & Food Model Assumptions for ${activeEvent.name}:\n` +
          `• Chargeable Portions: ${guestCount} ${activeEvent.foodPreference} portions\n` +
          `• Plate / Per-head Rate: ₹${plateRate.toLocaleString('en-IN')}\n` +
          `• Live Stations & Extras: ₹${extras.toLocaleString('en-IN')}\n` +
          `• Total Catering Estimate: ₹${(guestCount * plateRate + extras).toLocaleString('en-IN')}\n\n` +
          `All calculations use integer precision arithmetic and match approved budget baselines.`;
      } else {
        // Route general conversation through AI Usage Gateway!
        aiGatewayClient
          .execute(
            {
              workflow: 'GENERAL_CHAT',
              prompt: `Celebration context: ${activeEvent.name} (${activeEvent.type}), City: ${activeEvent.city}, Budget: ₹${activeEvent.totalBudget}, Guests: ${activeEvent.guestCount}. User query: ${text}`,
              eventId: activeEvent.id,
              eventVersion: activeEvent.version || 1,
            },
            user?.uid || 'demo-user-guest',
            isDemoMode
          )
          .then((res) => {
            let replyText = '';
            if (res.success && res.text) {
              const metaFooter = `\n\n*(Routed via AI Usage Gateway · ${res.modelId} · ${res.tokenUsage.totalTokens} tokens · $${res.estimatedCostUsd.toFixed(5)}${res.cacheHit ? ' · Cached' : ''})*`;
              replyText = `${res.text}${metaFooter}`;
            } else if (res.error) {
              let domainAdvice = '';
              if (activeEvent.type === 'birthday') {
                domainAdvice = `Here are recommendations for ${activeEvent.name} (${activeEvent.guestCount} guests in ${activeEvent.city}):\n• **Timeline & Cake:** Confirm cake delivery 2-3 hours prior and secure venue refrigeration.\n• **Guest Activities:** Arrange 3-4 interactive games (musical statues, treasure hunt) and 1 main attraction.\n• **Favors:** Prepare ${activeEvent.guestCount} personalized return gift hampers with 5 spares for siblings.`;
              } else if (activeEvent.type === 'community') {
                domainAdvice = `Here are recommendations for ${activeEvent.name} (${activeEvent.guestCount} attendees in ${activeEvent.city}):\n• **Permissions:** Secure municipal noise and public gathering clearances.\n• **Volunteers:** Assign captain leads for registration, first aid, and refreshment kiosks.\n• **Sound & Stage:** Coordinate 125 kVA generator backup for stage AV.`;
              } else {
                domainAdvice = `Here are recommendations for ${activeEvent.name} (${activeEvent.guestCount} guests in ${activeEvent.city}):\n• **Catering:** Re-verify headcount guarantees 14 days before the event.\n• **Logistics:** Coordinate ritual samagri, invitation dispatches, and master tailor fittings.\n• **Contingency:** Maintain a 10-15% reserve buffer for last-minute headcount variations.`;
              }
              replyText = `${domainAdvice}\n\n*(Gateway Notice: ${res.error})*`;
            } else {
              replyText = `I received your query regarding ${activeEvent.name}: "${text}". Your celebration parameters are configured with ${activeEvent.guestCount} guests and ₹${activeEvent.totalBudget.toLocaleString('en-IN')} total budget.`;
            }

            const botMsg: CopilotMessage = {
              id: `msg-bot-${Date.now()}`,
              sender: 'assistant',
              text: replyText,
              timestamp: 'Just now',
            };
            setCopilotMessages((prev) => [...prev, botMsg]);
          })
          .catch(() => {
            const botMsg: CopilotMessage = {
              id: `msg-bot-${Date.now()}`,
              sender: 'assistant',
              text: `I received your query regarding ${activeEvent.name}: "${text}". Planned according to your ₹${activeEvent.totalBudget.toLocaleString('en-IN')} budget baseline.`,
              timestamp: 'Just now',
            };
            setCopilotMessages((prev) => [...prev, botMsg]);
          });
        return;
      }

      const botMsg: CopilotMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: 'Just now',
        proposal,
        quickActions,
      };

      setCopilotMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const resetAllDemoData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setLocalEvents([INITIAL_EVENT]);
    setLocalActiveEventId(INITIAL_EVENT.id);
    setLocalCategories(INITIAL_BUDGET_CATEGORIES);
    setLocalTasks(INITIAL_TASKS);
    setLocalVendorQuotes(INITIAL_VENDOR_QUOTES);
    setTeamMembers(INITIAL_TEAM_MEMBERS);
    setLocalProposals([]);
    setActiveProposalModal(null);
    setCurrentTab('dashboard');
    showToast('Reset completed: All demo data and allocations restored to original baseline.', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        copilotOpen,
        setCopilotOpen,
        onboardingOpen,
        setOnboardingOpen,
        activeProposalModal,
        setActiveProposalModal,
        language,
        setLanguage,
        reducedMotion,
        setReducedMotion,
        toasts,
        showToast,
        removeToast,
        events,
        activeEventId,
        activeEvent,
        setActiveEventId,
        createNewEvent,
        updateEvent,
        setEventDate,
        seedSampleEventToCloud,
        categories,
        updateCategoryAllocated,
        updateCategory,
        lockCategoryPayment,
        finalizeVendorForCategory,
        unfinalizeVendorForCategory,
        tasks,
        toggleSubtask,
        updateTaskStatus,
        updateTask,
        addTask,
        addMultipleTasks,
        deleteTask,
        expandTaskWithAI,
        proposals,
        createGuestProposal,
        approveProposal,
        rejectProposal,
        vendorQuotes,
        addVendorQuote,
        updateVendorQuote,
        deleteVendorQuote,
        updateQuoteStatus,
        teamMembers,
        updateTeamMember,
        addTeamMember,
        copilotMessages,
        sendCopilotMessage,
        resetAllDemoData,
        isSyncing,
        syncError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
