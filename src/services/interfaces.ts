import {
  BudgetCategory,
  ChangeProposal,
  EventModel,
  TaskItem,
  VendorQuote,
} from '../types';

export interface IEventRepository {
  getEvents(userId?: string): Promise<EventModel[]>;
  getEvent(eventId: string): Promise<EventModel | null>;
  createEvent(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[]
  ): Promise<void>;
  updateEvent(eventId: string, updates: Partial<EventModel>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  subscribeEvents(
    userId: string,
    callback: (events: EventModel[]) => void,
    onError?: (error: Error) => void
  ): () => void;
}

export interface IBudgetService {
  getCategories(eventId: string): Promise<BudgetCategory[]>;
  updateCategory(
    eventId: string,
    categoryId: string,
    updates: Partial<BudgetCategory>
  ): Promise<void>;
  applyProposal(
    eventId: string,
    proposal: ChangeProposal,
    categories: BudgetCategory[],
    event: EventModel
  ): Promise<void>;
  subscribeCategories(
    eventId: string,
    callback: (categories: BudgetCategory[]) => void,
    onError?: (error: Error) => void
  ): () => void;
}

export interface ITaskService {
  getTasks(eventId: string): Promise<TaskItem[]>;
  addTask(eventId: string, task: TaskItem): Promise<void>;
  updateTask(
    eventId: string,
    taskId: string,
    updates: Partial<TaskItem>
  ): Promise<void>;
  deleteTask(eventId: string, taskId: string): Promise<void>;
  subscribeTasks(
    eventId: string,
    callback: (tasks: TaskItem[]) => void,
    onError?: (error: Error) => void
  ): () => void;
}

export interface IVendorService {
  getQuotes(eventId: string): Promise<VendorQuote[]>;
  addQuote(eventId: string, quote: VendorQuote): Promise<void>;
  updateQuoteStatus(
    eventId: string,
    quoteId: string,
    status: 'review' | 'shortlisted' | 'rejected'
  ): Promise<void>;
  subscribeQuotes(
    eventId: string,
    callback: (quotes: VendorQuote[]) => void,
    onError?: (error: Error) => void
  ): () => void;
}
