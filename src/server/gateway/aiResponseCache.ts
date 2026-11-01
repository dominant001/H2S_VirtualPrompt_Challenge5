import crypto from 'crypto';
import { GATEWAY_CONFIG } from './config';
import { AIWorkflow, ModelRouteConfig } from './types';

interface CacheEntry {
  key: string;
  workflow: AIWorkflow;
  eventId?: string;
  eventVersion?: number;
  userId?: string;
  text: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: number;
  expiresAt: number;
}

export class AIResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxEntries: number = GATEWAY_CONFIG.MAX_CACHE_ENTRIES;

  /**
   * Generates a deterministic SHA-256 hash of prompt and context.
   */
  public hashContent(content: string, context?: Record<string, any>): string {
    const serialized = context ? `${content}::${JSON.stringify(context)}` : content;
    return crypto.createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  }

  /**
   * Constructs the full cache key following architectural rules:
   * [workflow, eventVersion, userScope, promptHash, modelId, modelVersion]
   */
  public buildCacheKey(
    workflow: AIWorkflow,
    routeConfig: ModelRouteConfig,
    prompt: string,
    userId: string,
    eventId?: string,
    eventVersion: number = 1,
    context?: Record<string, any>
  ): string {
    const promptHash = this.hashContent(prompt, context);
    const userScope = routeConfig.isPersonalized ? userId : 'public';
    const eventScope = routeConfig.isPersonalized && eventId ? `${eventId}:v${eventVersion}` : 'generic';

    return `ai_cache:${workflow}:${eventScope}:${userScope}:${routeConfig.primaryModelId}:${promptHash}`;
  }

  /**
   * Retrieves cached response if valid and not expired.
   */
  public get(
    key: string,
    currentEventVersion?: number
  ): { hit: boolean; entry?: CacheEntry } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { hit: false };
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return { hit: false };
    }

    // Invalidate if event version changed since cached
    if (
      entry.eventVersion !== undefined &&
      currentEventVersion !== undefined &&
      entry.eventVersion !== currentEventVersion
    ) {
      this.cache.delete(key);
      return { hit: false };
    }

    return { hit: true, entry };
  }

  /**
   * Stores response in cache with specified TTL.
   */
  public set(
    key: string,
    workflow: AIWorkflow,
    text: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    ttlSeconds: number,
    eventId?: string,
    eventVersion?: number,
    userId?: string
  ): void {
    if (ttlSeconds <= 0) return;

    // Prune if cache is oversized
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      workflow,
      eventId,
      eventVersion,
      userId,
      text,
      modelId,
      inputTokens,
      outputTokens,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidates all cached entries for a specific celebration when it is updated.
   */
  public invalidateEvent(eventId: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.eventId === eventId) {
        this.cache.delete(key);
        count += 1;
      }
    }
    return count;
  }

  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  public getCacheStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }

  public resetForTesting(): void {
    this.cache.clear();
  }
}

export const aiResponseCache = new AIResponseCache();
