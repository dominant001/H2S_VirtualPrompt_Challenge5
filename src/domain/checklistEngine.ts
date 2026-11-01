import { TaskItem, SubTask, TaskPriority, TaskStatus } from '../types';

export interface DependencyValidationResult {
  hasCycle: boolean;
  cyclePath?: string[];
  reason?: string;
}

export interface LeafProgressResult {
  totalLeaves: number;
  completedLeaves: number;
  percentage: number;
}

export interface MilestoneDateResult {
  hasAbsoluteDate: boolean;
  absoluteDateStr?: string;
  formattedDisplay: string;
  relativeDaysLabel: string;
  timeZone: string;
}

export interface TaskExpansionCandidate {
  title: string;
  subcategoryName: string;
  description: string;
  priority: TaskPriority;
  relativeOffsetDays: number;
  estimatedCost?: number;
  rationale: string;
  isDuplicate?: boolean;
}

export class ChecklistEngine {
  /**
   * Validates whether adding targetPrerequisiteId to task's dependencies creates a circular graph.
   * Uses Depth-First Search (DFS) cycle detection.
   */
  static detectCycle(
    tasks: TaskItem[],
    taskId: string,
    newPrerequisiteId: string
  ): DependencyValidationResult {
    if (taskId === newPrerequisiteId) {
      return {
        hasCycle: true,
        cyclePath: [taskId, newPrerequisiteId],
        reason: 'A task cannot depend on itself.',
      };
    }

    // Build adjacency list: target -> prerequisites
    const adj = new Map<string, string[]>();
    for (const t of tasks) {
      adj.set(t.id, [...(t.dependsOnIds || [])]);
    }

    // Add proposed edge
    const currentDeps = adj.get(taskId) || [];
    if (!currentDeps.includes(newPrerequisiteId)) {
      adj.set(taskId, [...currentDeps, newPrerequisiteId]);
    }

    // Check if newPrerequisiteId can reach taskId (which would mean a cycle)
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (curr: string): boolean => {
      visited.add(curr);
      recStack.add(curr);
      path.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          if (dfs(n)) return true;
        } else if (recStack.has(n)) {
          path.push(n);
          return true;
        }
      }

      recStack.delete(curr);
      path.pop();
      return false;
    };

    // Run DFS starting from the new prerequisite to see if it reaches taskId
    const hasCycle = dfs(newPrerequisiteId);

    if (hasCycle) {
      const cycleIndex = path.indexOf(newPrerequisiteId);
      const cleanPath = cycleIndex >= 0 ? path.slice(cycleIndex) : path;
      cleanPath.unshift(taskId);

      return {
        hasCycle: true,
        cyclePath: cleanPath,
        reason: `Circular dependency detected: ${cleanPath.join(' -> ')}`,
      };
    }

    return { hasCycle: false };
  }

  /**
   * Checks whether a task is blocked by any uncompleted prerequisite task.
   */
  static evaluatePrerequisites(
    task: TaskItem,
    allTasks: TaskItem[]
  ): {
    isBlocked: boolean;
    pendingDependencies: { id: string; title: string; status: TaskStatus }[];
    completedCount: number;
    totalCount: number;
  } {
    if (!task.dependsOnIds || task.dependsOnIds.length === 0) {
      return {
        isBlocked: false,
        pendingDependencies: [],
        completedCount: 0,
        totalCount: 0,
      };
    }

    const taskMap = new Map(allTasks.map((t) => [t.id, t]));
    const pending: { id: string; title: string; status: TaskStatus }[] = [];
    let completedCount = 0;

    for (const depId of task.dependsOnIds) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        if (depTask.status === 'completed') {
          completedCount++;
        } else {
          pending.push({
            id: depTask.id,
            title: depTask.title,
            status: depTask.status,
          });
        }
      }
    }

    return {
      isBlocked: pending.length > 0,
      pendingDependencies: pending,
      completedCount,
      totalCount: task.dependsOnIds.length,
    };
  }

  /**
   * Calculates leaf task progress.
   * If a task has subtasks: each subtask counts as 1 leaf item.
   * If a task has no subtasks: the task itself counts as 1 leaf item.
   */
  static calculateLeafProgress(tasks: TaskItem[]): LeafProgressResult {
    let totalLeaves = 0;
    let completedLeaves = 0;

    for (const task of tasks) {
      if (task.subtasks && task.subtasks.length > 0) {
        for (const st of task.subtasks) {
          totalLeaves++;
          if (st.completed) {
            completedLeaves++;
          }
        }
      } else {
        totalLeaves++;
        if (task.status === 'completed') {
          completedLeaves++;
        }
      }
    }

    const percentage = totalLeaves > 0 ? Math.round((completedLeaves / totalLeaves) * 100) : 0;
    return {
      totalLeaves,
      completedLeaves,
      percentage,
    };
  }

  /**
   * Calculates progress for a specific category.
   */
  static calculateCategoryProgress(tasks: TaskItem[], categoryNameOrId: string): LeafProgressResult {
    const matched = tasks.filter(
      (t) =>
        t.categoryName.toLowerCase() === categoryNameOrId.toLowerCase() ||
        t.categoryId.toLowerCase() === categoryNameOrId.toLowerCase()
    );
    return this.calculateLeafProgress(matched);
  }

  /**
   * Calculates absolute date from relative offset if eventDate is provided.
   * Strictly avoids inventing dates when eventDate is undefined or empty.
   */
  static calculateMilestoneDate(
    eventDate: string | null | undefined,
    relativeOffsetDays: number | undefined,
    timeZone = 'Asia/Kolkata'
  ): MilestoneDateResult {
    const offset = relativeOffsetDays ?? 0;
    const offsetDaysAbs = Math.abs(offset);

    let relativeDaysLabel = 'Milestone';
    if (offset === 0) {
      relativeDaysLabel = 'Event Day (T-0)';
    } else if (offset < 0) {
      relativeDaysLabel = `T-${offsetDaysAbs} days (${offsetDaysAbs} days before event)`;
    } else {
      relativeDaysLabel = `T+${offsetDaysAbs} days (${offsetDaysAbs} days after event)`;
    }

    // No event date set: strictly return relative milestone only
    if (!eventDate || typeof eventDate !== 'string' || eventDate.trim() === '') {
      return {
        hasAbsoluteDate: false,
        formattedDisplay: relativeDaysLabel,
        relativeDaysLabel,
        timeZone,
      };
    }

    try {
      // Parse ISO date (YYYY-MM-DD or full ISO)
      const parts = eventDate.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);

        // Calculate target date
        const baseDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
        baseDate.setUTCDate(baseDate.getUTCDate() + offset);

        const formatter = new Intl.DateTimeFormat('en-IN', {
          timeZone,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const formattedDate = formatter.format(baseDate);
        const isoStr = baseDate.toISOString().split('T')[0];

        return {
          hasAbsoluteDate: true,
          absoluteDateStr: isoStr,
          formattedDisplay: `${formattedDate} (IST)`,
          relativeDaysLabel,
          timeZone,
        };
      }
    } catch {
      // Fallback if parsing fails
    }

    return {
      hasAbsoluteDate: false,
      formattedDisplay: relativeDaysLabel,
      relativeDaysLabel,
      timeZone,
    };
  }

  /**
   * Deduplicates candidate expansion tasks against existing tasks and subtasks.
   * Marks candidate as isDuplicate if title matches loosely.
   */
  static deduplicateCandidates(
    candidates: TaskExpansionCandidate[],
    existingTasks: TaskItem[]
  ): TaskExpansionCandidate[] {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const existingNormalized = new Set<string>();

    for (const t of existingTasks) {
      existingNormalized.add(normalize(t.title));
      if (t.subtasks) {
        for (const st of t.subtasks) {
          existingNormalized.add(normalize(st.title));
        }
      }
    }

    return candidates.map((cand) => {
      const candNorm = normalize(cand.title);
      // Check for direct match or substring containment
      let isDuplicate = false;
      for (const ex of existingNormalized) {
        if (candNorm === ex || (candNorm.length > 8 && ex.includes(candNorm)) || (ex.length > 8 && candNorm.includes(ex))) {
          isDuplicate = true;
          break;
        }
      }
      return {
        ...cand,
        isDuplicate,
      };
    });
  }

  /**
   * Enforces role and permission validation for task updates.
   */
  static validateTaskPermission(params: {
    userId?: string;
    userRole?: string;
    isOwner?: boolean;
    isDemoMode?: boolean;
    action: 'view' | 'edit' | 'delete' | 'create';
  }): { allowed: boolean; reason?: string } {
    const { userId, userRole, isOwner, isDemoMode, action } = params;

    // In demo mode, full interactivity is enabled for preview
    if (isDemoMode) {
      return { allowed: true };
    }

    // Owner always has full access
    if (isOwner) {
      return { allowed: true };
    }

    // Logged in user with editor or admin role
    if (userId) {
      if (userRole === 'admin' || userRole === 'editor' || userRole === 'organizer') {
        return { allowed: true };
      }
      if (action === 'view') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'User lacks permission to modify tasks for this celebration. Contact event owner.',
      };
    }

    return {
      allowed: false,
      reason: 'Authentication required to modify tasks.',
    };
  }
}
