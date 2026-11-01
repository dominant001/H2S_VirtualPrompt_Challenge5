import { SuggestionResponse, AuditResponse } from '../server/checklist/checklistAdvisor';
import { Phase5Report } from '../server/checklist/tests';
import { TaskItem } from '../types';

export class ChecklistClient {
  static async requestTaskExpansion(params: {
    eventContext: {
      name?: string;
      type?: string;
      city?: string;
      guestCount?: number;
      eventDate?: string;
    };
    category: string;
    existingTasks: TaskItem[];
    idToken?: string;
  }): Promise<SuggestionResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: params.idToken ? (params.idToken.startsWith('Bearer ') ? params.idToken : `Bearer ${params.idToken}`) : 'Bearer demo-user-guest',
    };

    const res = await fetch('/api/checklist/expand', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventContext: params.eventContext,
        category: params.category,
        existingTasks: params.existingTasks,
      }),
    });

    if (!res.ok) {
      throw new Error(`Task expansion request failed with status ${res.status}`);
    }

    return res.json();
  }

  static async requestChecklistAudit(params: {
    eventContext: {
      name?: string;
      type?: string;
      city?: string;
      guestCount?: number;
      eventDate?: string;
    };
    tasks: TaskItem[];
    idToken?: string;
  }): Promise<AuditResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: params.idToken ? (params.idToken.startsWith('Bearer ') ? params.idToken : `Bearer ${params.idToken}`) : 'Bearer demo-user-guest',
    };

    const res = await fetch('/api/checklist/audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventContext: params.eventContext,
        tasks: params.tasks,
      }),
    });

    if (!res.ok) {
      throw new Error(`Checklist audit request failed with status ${res.status}`);
    }

    return res.json();
  }

  static async runAcceptanceTests(): Promise<Phase5Report> {
    const res = await fetch('/api/checklist/run-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Checklist test runner failed with status ${res.status}`);
    }

    return res.json();
  }
}
