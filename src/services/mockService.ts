import {
  IBudgetService,
  IEventRepository,
  ITaskService,
  IVendorService,
} from './interfaces';
import {
  BudgetCategory,
  ChangeProposal,
  EventModel,
  TaskItem,
  VendorQuote,
} from '../types';
import {
  INITIAL_BUDGET_CATEGORIES,
  INITIAL_EVENT,
  INITIAL_TASKS,
  INITIAL_VENDOR_QUOTES,
} from '../data/seedData';
import { applyProposalToCategories } from './budgetCalculator';

export class MockEventRepository implements IEventRepository {
  private events: EventModel[] = [{ ...INITIAL_EVENT }];
  private subscribers: ((events: EventModel[]) => void)[] = [];

  async getEvents(): Promise<EventModel[]> {
    return [...this.events];
  }

  async getEvent(eventId: string): Promise<EventModel | null> {
    const ev = this.events.find((e) => e.id === eventId);
    return ev ? { ...ev } : null;
  }

  async createEvent(
    event: EventModel,
    _categories: BudgetCategory[],
    _tasks: TaskItem[]
  ): Promise<void> {
    this.events.push(event);
    this.notify();
  }

  async updateEvent(eventId: string, updates: Partial<EventModel>): Promise<void> {
    this.events = this.events.map((e) =>
      e.id === eventId ? { ...e, ...updates } : e
    );
    this.notify();
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events = this.events.filter((e) => e.id !== eventId);
    this.notify();
  }

  subscribeEvents(
    _userId: string,
    callback: (events: EventModel[]) => void
  ): () => void {
    this.subscribers.push(callback);
    callback([...this.events]);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((s) => s([...this.events]));
  }
}

export class MockBudgetService implements IBudgetService {
  private categories: BudgetCategory[] = [...INITIAL_BUDGET_CATEGORIES];
  private subscribers: ((categories: BudgetCategory[]) => void)[] = [];

  async getCategories(eventId: string): Promise<BudgetCategory[]> {
    return this.categories.filter((c) => c.eventId === eventId);
  }

  async updateCategory(
    eventId: string,
    categoryId: string,
    updates: Partial<BudgetCategory>
  ): Promise<void> {
    this.categories = this.categories.map((c) =>
      c.id === categoryId ? { ...c, ...updates } : c
    );
    this.notify(eventId);
  }

  async applyProposal(
    eventId: string,
    proposal: ChangeProposal,
    categories: BudgetCategory[],
    _event: EventModel
  ): Promise<void> {
    this.categories = categories;
    this.notify(eventId);
  }

  subscribeCategories(
    eventId: string,
    callback: (categories: BudgetCategory[]) => void
  ): () => void {
    this.subscribers.push(callback);
    callback(this.categories.filter((c) => c.eventId === eventId));
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(eventId: string) {
    const list = this.categories.filter((c) => c.eventId === eventId);
    this.subscribers.forEach((s) => s(list));
  }
}

export class MockTaskService implements ITaskService {
  private tasks: TaskItem[] = [...INITIAL_TASKS];
  private subscribers: ((tasks: TaskItem[]) => void)[] = [];

  async getTasks(eventId: string): Promise<TaskItem[]> {
    return this.tasks.filter((t) => t.eventId === eventId);
  }

  async addTask(eventId: string, task: TaskItem): Promise<void> {
    this.tasks.push(task);
    this.notify(eventId);
  }

  async updateTask(
    eventId: string,
    taskId: string,
    updates: Partial<TaskItem>
  ): Promise<void> {
    this.tasks = this.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
    this.notify(eventId);
  }

  async deleteTask(eventId: string, taskId: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    this.notify(eventId);
  }

  subscribeTasks(
    eventId: string,
    callback: (tasks: TaskItem[]) => void
  ): () => void {
    this.subscribers.push(callback);
    callback(this.tasks.filter((t) => t.eventId === eventId));
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(eventId: string) {
    const list = this.tasks.filter((t) => t.eventId === eventId);
    this.subscribers.forEach((s) => s(list));
  }
}

export class MockVendorService implements IVendorService {
  private quotes: VendorQuote[] = [...INITIAL_VENDOR_QUOTES];
  private subscribers: ((quotes: VendorQuote[]) => void)[] = [];

  async getQuotes(_eventId: string): Promise<VendorQuote[]> {
    return [...this.quotes];
  }

  async addQuote(eventId: string, quote: VendorQuote): Promise<void> {
    this.quotes.push(quote);
    this.notify(eventId);
  }

  async updateQuoteStatus(
    eventId: string,
    quoteId: string,
    status: 'review' | 'shortlisted' | 'finalized' | 'rejected'
  ): Promise<void> {
    this.quotes = this.quotes.map((q) => (q.id === quoteId ? { ...q, status } : q));
    this.notify(eventId);
  }

  subscribeQuotes(
    eventId: string,
    callback: (quotes: VendorQuote[]) => void
  ): () => void {
    this.subscribers.push(callback);
    callback([...this.quotes]);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(eventId: string) {
    this.subscribers.forEach((s) => s([...this.quotes]));
  }
}
