import { GATEWAY_CONFIG } from './config';

interface RateRecord {
  timestamps: number[];
}

export class RateLimitService {
  private userRateMap: Map<string, RateRecord> = new Map();
  private userActiveLocks: Set<string> = new Set();
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  /**
   * Checks whether the user is rate-limited under the sliding window.
   */
  public checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number; error?: string } {
    const now = Date.now();
    const windowStart = now - GATEWAY_CONFIG.RATE_LIMIT_WINDOW_MS;

    let record = this.userRateMap.get(userId);
    if (!record) {
      record = { timestamps: [] };
      this.userRateMap.set(userId, record);
    }

    // Clean older timestamps
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    if (record.timestamps.length >= GATEWAY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindow = record.timestamps[0];
      const retryAfterMs = Math.max(500, oldestInWindow + GATEWAY_CONFIG.RATE_LIMIT_WINDOW_MS - now);
      return {
        allowed: false,
        retryAfterMs,
        error: `Rate limit exceeded. Maximum ${GATEWAY_CONFIG.MAX_REQUESTS_PER_WINDOW} requests per minute allowed. Please try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
      };
    }

    record.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Acquires a concurrency lock for a user.
   * Returns true if lock acquired, false if user already has an active generation running.
   */
  public acquireConcurrencyLock(userId: string): boolean {
    if (this.userActiveLocks.has(userId)) {
      return false;
    }
    this.userActiveLocks.add(userId);
    return true;
  }

  /**
   * Releases the concurrency lock for a user.
   */
  public releaseConcurrencyLock(userId: string): void {
    this.userActiveLocks.delete(userId);
  }

  /**
   * Checks if an identical in-flight request exists.
   */
  public getInFlightPromise<T>(dedupeKey: string): Promise<T> | undefined {
    return this.inFlightRequests.get(dedupeKey);
  }

  /**
   * Registers an in-flight promise for deduplication.
   */
  public registerInFlightPromise<T>(dedupeKey: string, promise: Promise<T>): void {
    this.inFlightRequests.set(dedupeKey, promise);
    promise
      .finally(() => {
        this.inFlightRequests.delete(dedupeKey);
      })
      .catch(() => {
        // Ignore here; handled by callers
      });
  }

  public resetForTesting(): void {
    this.userRateMap.clear();
    this.userActiveLocks.clear();
    this.inFlightRequests.clear();
  }
}

export const rateLimitService = new RateLimitService();
