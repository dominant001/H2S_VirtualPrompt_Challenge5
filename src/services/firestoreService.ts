import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
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

/**
 * Deep sanitization helper that recursively removes undefined fields
 * to prevent Firestore SDK "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean as any;
  }
  return data;
}

export class FirestoreEventRepository implements IEventRepository {
  async getEvents(userId?: string): Promise<EventModel[]> {
    if (!userId) return [];
    const path = 'events';
    try {
      const q = query(collection(db, path), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as EventModel);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async getEvent(eventId: string): Promise<EventModel | null> {
    const path = `events/${eventId}`;
    try {
      const snap = await getDoc(doc(db, 'events', eventId));
      if (!snap.exists()) return null;
      return snap.data() as EventModel;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async createEvent(
    event: EventModel,
    categories: BudgetCategory[],
    tasks: TaskItem[]
  ): Promise<void> {
    const eventRef = doc(db, 'events', event.id);
    const sanitizedEvent = sanitizeForFirestore({
      ...event,
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. Write the root event document first so it exists in Firestore
    try {
      await setDoc(eventRef, sanitizedEvent);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `events/${event.id}`);
    }

    // 2. Write subcollections in an atomic batch
    const batch = writeBatch(db);

    // Member record
    const memberRef = doc(db, `events/${event.id}/members`, event.ownerId || 'owner');
    batch.set(
      memberRef,
      sanitizeForFirestore({
        userId: event.ownerId,
        eventId: event.id,
        role: 'owner',
        addedAt: new Date().toISOString(),
      })
    );

    // Subcollection budget categories
    categories.forEach((cat) => {
      const catRef = doc(db, `events/${event.id}/budgetCategories`, cat.id);
      batch.set(catRef, sanitizeForFirestore(cat));
    });

    // Subcollection tasks
    tasks.forEach((task) => {
      const taskRef = doc(db, `events/${event.id}/tasks`, task.id);
      batch.set(taskRef, sanitizeForFirestore(task));
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}/subcollections`);
    }
  }

  async updateEvent(eventId: string, updates: Partial<EventModel>): Promise<void> {
    const path = `events/${eventId}`;
    try {
      const eventRef = doc(db, 'events', eventId);
      const sanitized = sanitizeForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(eventRef, sanitized);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    const path = `events/${eventId}`;
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  subscribeEvents(
    userId: string,
    callback: (events: EventModel[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const path = 'events';
    const q = query(collection(db, path), where('ownerId', '==', userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const events = snapshot.docs.map((d) => d.data() as EventModel);
        callback(events);
      },
      (error) => {
        console.warn('Firestore events subscription error:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Ignored events unsubscribe warning:', err);
        }
      }
    };
  }
}

export class FirestoreBudgetService implements IBudgetService {
  async getCategories(eventId: string): Promise<BudgetCategory[]> {
    const path = `events/${eventId}/budgetCategories`;
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as BudgetCategory);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async updateCategory(
    eventId: string,
    categoryId: string,
    updates: Partial<BudgetCategory>
  ): Promise<void> {
    const path = `events/${eventId}/budgetCategories/${categoryId}`;
    try {
      await updateDoc(
        doc(db, `events/${eventId}/budgetCategories`, categoryId),
        sanitizeForFirestore(updates)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async applyProposal(
    eventId: string,
    proposal: ChangeProposal,
    categories: BudgetCategory[],
    event: EventModel
  ): Promise<void> {
    const batch = writeBatch(db);

    // Save proposal record
    const propRef = doc(db, `events/${eventId}/changeProposals`, proposal.id);
    batch.set(propRef, sanitizeForFirestore(proposal));

    // Update event guestCount
    const eventRef = doc(db, 'events', eventId);
    batch.update(
      eventRef,
      sanitizeForFirestore({
        guestCount: proposal.impactSummary.revisedGuestCount,
        'cateringModel.chargeablePlates': proposal.impactSummary.revisedGuestCount,
        version: (event.version || 1) + 1,
        updatedAt: new Date().toISOString(),
      })
    );

    // Update categories
    categories.forEach((cat) => {
      const catRef = doc(db, `events/${eventId}/budgetCategories`, cat.id);
      batch.set(catRef, sanitizeForFirestore(cat));
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/changeProposals`);
    }
  }

  subscribeCategories(
    eventId: string,
    callback: (categories: BudgetCategory[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const path = `events/${eventId}/budgetCategories`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const cats = snapshot.docs.map((d) => d.data() as BudgetCategory);
        callback(cats);
      },
      (error) => {
        console.warn('Firestore budget categories subscription error:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Ignored categories unsubscribe warning:', err);
        }
      }
    };
  }
}

export class FirestoreTaskService implements ITaskService {
  async getTasks(eventId: string): Promise<TaskItem[]> {
    const path = `events/${eventId}/tasks`;
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as TaskItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async addTask(eventId: string, task: TaskItem): Promise<void> {
    const path = `events/${eventId}/tasks/${task.id}`;
    try {
      await setDoc(doc(db, `events/${eventId}/tasks`, task.id), sanitizeForFirestore(task));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async updateTask(
    eventId: string,
    taskId: string,
    updates: Partial<TaskItem>
  ): Promise<void> {
    const path = `events/${eventId}/tasks/${taskId}`;
    try {
      await updateDoc(
        doc(db, `events/${eventId}/tasks`, taskId),
        sanitizeForFirestore(updates)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async deleteTask(eventId: string, taskId: string): Promise<void> {
    const path = `events/${eventId}/tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, `events/${eventId}/tasks`, taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  subscribeTasks(
    eventId: string,
    callback: (tasks: TaskItem[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const path = `events/${eventId}/tasks`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const tasks = snapshot.docs.map((d) => d.data() as TaskItem);
        callback(tasks);
      },
      (error) => {
        console.warn('Firestore tasks subscription error:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Ignored tasks unsubscribe warning:', err);
        }
      }
    };
  }
}

export class FirestoreVendorService implements IVendorService {
  async getQuotes(eventId: string): Promise<VendorQuote[]> {
    const path = `events/${eventId}/quotes`;
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as VendorQuote);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async addQuote(eventId: string, quote: VendorQuote): Promise<void> {
    const path = `events/${eventId}/quotes/${quote.id}`;
    try {
      await setDoc(doc(db, `events/${eventId}/quotes`, quote.id), sanitizeForFirestore(quote));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async updateQuote(
    eventId: string,
    quoteId: string,
    updates: Partial<VendorQuote>
  ): Promise<void> {
    const path = `events/${eventId}/quotes/${quoteId}`;
    try {
      await updateDoc(
        doc(db, `events/${eventId}/quotes`, quoteId),
        sanitizeForFirestore(updates)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async updateQuoteStatus(
    eventId: string,
    quoteId: string,
    status: 'review' | 'shortlisted' | 'rejected'
  ): Promise<void> {
    return this.updateQuote(eventId, quoteId, { status });
  }

  async deleteQuote(eventId: string, quoteId: string): Promise<void> {
    const path = `events/${eventId}/quotes/${quoteId}`;
    try {
      await deleteDoc(doc(db, `events/${eventId}/quotes`, quoteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  subscribeQuotes(
    eventId: string,
    callback: (quotes: VendorQuote[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const path = `events/${eventId}/quotes`;
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const quotes = snapshot.docs.map((d) => d.data() as VendorQuote);
        callback(quotes);
      },
      (error) => {
        console.warn('Firestore quotes subscription error:', error);
        if (onError) onError(error);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Ignored quotes unsubscribe warning:', err);
        }
      }
    };
  }
}
