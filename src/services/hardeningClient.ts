/**
 * Utsav AI — Phase 8 Hardening & Acceptance Matrix Client
 */

import { HardeningTestSuiteReport } from '../server/hardening/tests';

export class HardeningClient {
  public static async runTests(): Promise<HardeningTestSuiteReport> {
    const res = await fetch('/api/hardening/run-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Hardening test runner failed with HTTP ${res.status}`);
    }

    return await res.json();
  }
}
