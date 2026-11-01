import { ChecklistEngine } from '../../domain/checklistEngine';
import { INITIAL_TASKS } from '../../data/seedData';
import { getTaskPackForEventType, buildTasksFromPack, WEDDING_TASK_PACK, BIRTHDAY_TASK_PACK, COMMUNITY_TASK_PACK } from '../../data/taskTemplates';
import { checklistAdvisorService } from './checklistAdvisor';
import { TaskItem } from '../../types';

export interface Phase5TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  data?: unknown;
}

export interface Phase5Report {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  timestamp: string;
  results: Phase5TestResult[];
}

export async function runChecklistTestSuite(): Promise<Phase5Report> {
  const results: Phase5TestResult[] = [];

  // ==========================================
  // TEST A: Groom Group Granularity
  // ==========================================
  try {
    const groomTasks = INITIAL_TASKS.filter((t) => t.categoryId.toLowerCase() === 'groom');
    const hasOutfits = groomTasks.some(
      (t) =>
        t.subcategoryName.includes('Attire') ||
        t.title.toLowerCase().includes('sherwani') ||
        t.title.toLowerCase().includes('tailor') ||
        t.title.toLowerCase().includes('fitting')
    );
    const hasFootwearAccessories = groomTasks.some(
      (t) =>
        t.subcategoryName.includes('Footwear') ||
        t.title.toLowerCase().includes('mojari') ||
        t.title.toLowerCase().includes('safa')
    );
    const hasStyling = groomTasks.some(
      (t) =>
        t.subcategoryName.includes('Grooming') ||
        t.title.toLowerCase().includes('hair') ||
        t.title.toLowerCase().includes('skincare')
    );
    const hasTransport = groomTasks.some(
      (t) =>
        t.subcategoryName.includes('Baraat') ||
        t.title.toLowerCase().includes('vintage car') ||
        t.title.toLowerCase().includes('route')
    );
    const hasGuestCoord = groomTasks.some(
      (t) =>
        t.subcategoryName.includes('Guest') ||
        t.title.toLowerCase().includes('room allotment') ||
        t.title.toLowerCase().includes('guest list')
    );

    const passed = hasOutfits && hasFootwearAccessories && hasStyling && hasTransport && hasGuestCoord && groomTasks.length >= 6;
    results.push({
      id: 'TEST_A_GROOM_GRANULARITY',
      name: 'Test A: Groom Group Granularity & Microtasks',
      passed,
      details: passed
        ? `Verified ${groomTasks.length} Groom tasks covering Outfits, Footwear/Accessories, Grooming, Baraat Transport, and Guest Coordination.`
        : 'Failed: Missing required Groom subcategories or insufficient microtasks.',
      data: {
        totalGroomTasks: groomTasks.length,
        subcategories: Array.from(new Set(groomTasks.map((t) => t.subcategoryName))),
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_A_GROOM_GRANULARITY',
      name: 'Test A: Groom Group Granularity & Microtasks',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST B: Leaf Task Check Roll-up
  // ==========================================
  try {
    const initialProgress = ChecklistEngine.calculateLeafProgress(INITIAL_TASKS);
    
    // Clone tasks and toggle 1 uncompleted leaf subtask
    const testTasks: TaskItem[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
    let toggledSubtaskTitle = '';
    let found = false;

    for (const t of testTasks) {
      if (t.subtasks && t.subtasks.length > 0) {
        const uncompleted = t.subtasks.find((st) => !st.completed);
        if (uncompleted) {
          uncompleted.completed = true;
          toggledSubtaskTitle = uncompleted.title;
          found = true;
          break;
        }
      }
    }

    const updatedProgress = ChecklistEngine.calculateLeafProgress(testTasks);
    const passed =
      found &&
      updatedProgress.completedLeaves === initialProgress.completedLeaves + 1 &&
      updatedProgress.totalLeaves === initialProgress.totalLeaves;

    results.push({
      id: 'TEST_B_LEAF_PROGRESS_ROLLUP',
      name: 'Test B: Leaf Task Completion & Progress Roll-up',
      passed,
      details: passed
        ? `Toggling leaf task "${toggledSubtaskTitle}" strictly incremented completed count from ${initialProgress.completedLeaves} to ${updatedProgress.completedLeaves} of ${initialProgress.totalLeaves} total leaves.`
        : 'Failed: Leaf task toggle did not correctly roll up to overall completion.',
      data: {
        initial: initialProgress,
        updated: updatedProgress,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_B_LEAF_PROGRESS_ROLLUP',
      name: 'Test B: Leaf Task Completion & Progress Roll-up',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST C: Invitation Dependencies & Cycle Rejection
  // ==========================================
  try {
    // 1. Verify sequence order
    const invTasks = INITIAL_TASKS.filter((t) => t.categoryId.toLowerCase() === 'invitations');
    const inv1 = invTasks.find((t) => t.id === 'task-inv-1');
    const inv2 = invTasks.find((t) => t.id === 'task-inv-2');
    const inv3 = invTasks.find((t) => t.id === 'task-inv-3');
    const inv4 = invTasks.find((t) => t.id === 'task-inv-4');
    const inv5 = invTasks.find((t) => t.id === 'task-inv-5');
    const inv6 = invTasks.find((t) => t.id === 'task-inv-6');
    const inv7 = invTasks.find((t) => t.id === 'task-inv-7');

    const chainValid =
      inv2?.dependsOnIds.includes('task-inv-1') &&
      inv3?.dependsOnIds.includes('task-inv-2') &&
      inv4?.dependsOnIds.includes('task-inv-3') &&
      inv5?.dependsOnIds.includes('task-inv-4') &&
      inv6?.dependsOnIds.includes('task-inv-5') &&
      inv7?.dependsOnIds.includes('task-inv-6');

    // 2. Test cycle detection: try making inv-1 depend on inv-7
    const cycleCheck = ChecklistEngine.detectCycle(INITIAL_TASKS, 'task-inv-1', 'task-inv-7');
    const selfCycleCheck = ChecklistEngine.detectCycle(INITIAL_TASKS, 'task-inv-1', 'task-inv-1');

    // 3. Test blocking evaluation
    const inv5Prereqs = ChecklistEngine.evaluatePrerequisites(inv5!, INITIAL_TASKS);

    const passed = chainValid && cycleCheck.hasCycle && selfCycleCheck.hasCycle && inv5Prereqs.isBlocked;

    results.push({
      id: 'TEST_C_INVITATION_DEPENDENCIES',
      name: 'Test C: Invitation Dependency Chain & Cycle Rejection',
      passed: Boolean(passed),
      details: passed
        ? 'Verified 7-step invitation dependency chain, blocked prerequisite evaluation, and cycle rejection.'
        : 'Failed: Invitation chain incomplete or cycle was not detected.',
      data: {
        chainValid,
        cycleDetected: cycleCheck.hasCycle,
        cycleReason: cycleCheck.reason,
        inv5Blocked: inv5Prereqs.isBlocked,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_C_INVITATION_DEPENDENCIES',
      name: 'Test C: Invitation Dependency Chain & Cycle Rejection',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST D: Date Uncertainty & Timezone Relative Milestones
  // ==========================================
  try {
    // 1. Unset date -> relative milestone only
    const uncertainDateResult = ChecklistEngine.calculateMilestoneDate(undefined, -60, 'Asia/Kolkata');
    const emptyDateResult = ChecklistEngine.calculateMilestoneDate('', -15, 'Asia/Kolkata');

    // 2. Confirmed date -> calculated absolute date with Asia/Kolkata timezone
    const confirmedDateResult = ChecklistEngine.calculateMilestoneDate('2025-11-15', -60, 'Asia/Kolkata');

    const hasSept =
      confirmedDateResult.formattedDisplay.includes('16 Sep') ||
      confirmedDateResult.formattedDisplay.includes('16 Sept');

    const passed =
      !uncertainDateResult.hasAbsoluteDate &&
      uncertainDateResult.formattedDisplay.includes('T-60') &&
      !emptyDateResult.hasAbsoluteDate &&
      confirmedDateResult.hasAbsoluteDate &&
      hasSept &&
      confirmedDateResult.formattedDisplay.includes('2025') &&
      confirmedDateResult.formattedDisplay.includes('IST');

    results.push({
      id: 'TEST_D_DATE_UNCERTAINTY',
      name: 'Test D: Date Uncertainty & Asia/Kolkata Relative Milestones',
      passed: Boolean(passed),
      details: passed
        ? `Unconfirmed dates strictly output relative milestones ("${uncertainDateResult.formattedDisplay}"); confirmed date calculates "${confirmedDateResult.formattedDisplay}".`
        : 'Failed: Unconfirmed dates generated absolute dates or date calculation was incorrect.',
      data: {
        uncertainOutput: uncertainDateResult.formattedDisplay,
        confirmedOutput: confirmedDateResult.formattedDisplay,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_D_DATE_UNCERTAINTY',
      name: 'Test D: Date Uncertainty & Asia/Kolkata Relative Milestones',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST E: Gemini Expansion Preview & Deduplication
  // ==========================================
  try {
    const expansion = await checklistAdvisorService.suggestTaskExpansion(
      { name: 'Sharma Wedding', type: 'wedding', city: 'Jaipur', guestCount: 200 },
      'groom',
      INITIAL_TASKS
    );

    const hasSuggestions = expansion.suggestions.length >= 2;
    const allHaveRationales = expansion.suggestions.every((s) => s.rationale && s.rationale.length > 5);

    // Test explicit deduplication behavior
    const duplicateCandidate = {
      title: 'Groom outfit selection & fabric finalization', // Exact title from seedData
      subcategoryName: 'Attire',
      description: 'Duplicate task test',
      priority: 'high' as const,
      relativeOffsetDays: -60,
      rationale: 'Test duplicate detection',
    };
    const dedupeCheck = ChecklistEngine.deduplicateCandidates([duplicateCandidate], INITIAL_TASKS);
    const dedupePassed = dedupeCheck[0].isDuplicate === true;

    const passed = hasSuggestions && allHaveRationales && dedupePassed;

    results.push({
      id: 'TEST_E_EXPANSION_PREVIEW',
      name: 'Test E: Gemini Expansion Preview & Deduplication',
      passed: Boolean(passed),
      details: passed
        ? `Generated ${expansion.suggestions.length} candidate microtasks with operational rationales; verified duplicate detection against existing tasks.`
        : 'Failed: Expansion did not generate valid candidates or deduplication failed.',
      data: {
        totalSuggested: expansion.totalSuggested,
        simulated: expansion.simulated,
        dedupeWorking: dedupePassed,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_E_EXPANSION_PREVIEW',
      name: 'Test E: Gemini Expansion Preview & Deduplication',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST F: Multi-Event Pack Templates
  // ==========================================
  try {
    const weddingPack = getTaskPackForEventType('wedding');
    const birthdayPack = getTaskPackForEventType('birthday');
    const communityPack = getTaskPackForEventType('community');

    const weddingTasks = buildTasksFromPack(weddingPack, 'test-w');
    const birthdayTasks = buildTasksFromPack(birthdayPack, 'test-b');
    const communityTasks = buildTasksFromPack(communityPack, 'test-c');

    const weddingHasGroom = weddingTasks.some((t) => t.categoryName === 'Groom');
    const birthdayHasCakeGames = birthdayTasks.some((t) => t.title.toLowerCase().includes('cake') || t.title.toLowerCase().includes('games'));
    const birthdayHasZeroWeddingTasks = !birthdayTasks.some((t) => t.title.toLowerCase().includes('sherwani') || t.title.toLowerCase().includes('mandap'));

    const communityHasCivicSafety = communityTasks.some((t) => t.title.toLowerCase().includes('police') || t.title.toLowerCase().includes('volunteer') || t.title.toLowerCase().includes('stage'));
    const communityHasZeroWeddingTasks = !communityTasks.some((t) => t.title.toLowerCase().includes('baraat') || t.title.toLowerCase().includes('sherwani'));

    const passed =
      weddingHasGroom &&
      birthdayHasCakeGames &&
      birthdayHasZeroWeddingTasks &&
      communityHasCivicSafety &&
      communityHasZeroWeddingTasks;

    results.push({
      id: 'TEST_F_MULTI_EVENT_TEMPLATES',
      name: 'Test F: Multi-Event Pack Templates (Wedding, Birthday, Community)',
      passed,
      details: passed
        ? `Loaded discrete packs: Wedding (${weddingTasks.length} tasks), Birthday (${birthdayTasks.length} tasks), and Community (${communityTasks.length} tasks) with zero cross-contamination.`
        : 'Failed: Multi-event packs contained overlapping or incorrect task types.',
      data: {
        weddingCount: weddingTasks.length,
        birthdayCount: birthdayTasks.length,
        communityCount: communityTasks.length,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_F_MULTI_EVENT_TEMPLATES',
      name: 'Test F: Multi-Event Pack Templates (Wedding, Birthday, Community)',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  // ==========================================
  // TEST G: Role/Access Security Enforcement
  // ==========================================
  try {
    const unauthorizedCheck = ChecklistEngine.validateTaskPermission({
      userId: 'user-guest-reader',
      userRole: 'viewer',
      isOwner: false,
      isDemoMode: false,
      action: 'edit',
    });

    const ownerCheck = ChecklistEngine.validateTaskPermission({
      userId: 'user-owner',
      isOwner: true,
      isDemoMode: false,
      action: 'edit',
    });

    const demoModeCheck = ChecklistEngine.validateTaskPermission({
      isDemoMode: true,
      action: 'edit',
    });

    const passed =
      !unauthorizedCheck.allowed &&
      Boolean(unauthorizedCheck.reason) &&
      ownerCheck.allowed &&
      demoModeCheck.allowed;

    results.push({
      id: 'TEST_G_ROLE_ACCESS_SECURITY',
      name: 'Test G: Role & Access Permission Enforcement',
      passed: Boolean(passed),
      details: passed
        ? 'Verified unauthorized modifications are rejected with explanation; owners and demo preview users retain edit permissions.'
        : 'Failed: Role security allowed unauthorized edits or blocked legitimate owner.',
      data: {
        unauthorizedRejected: !unauthorizedCheck.allowed,
        ownerAllowed: ownerCheck.allowed,
        demoAllowed: demoModeCheck.allowed,
      },
    });
  } catch (err: unknown) {
    results.push({
      id: 'TEST_G_ROLE_ACCESS_SECURITY',
      name: 'Test G: Role & Access Permission Enforcement',
      passed: false,
      details: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return {
    allPassed,
    totalTests: results.length,
    passedTests: passedCount,
    failedTests: results.length - passedCount,
    timestamp: new Date().toISOString(),
    results,
  };
}
