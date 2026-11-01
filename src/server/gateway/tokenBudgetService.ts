import { GATEWAY_CONFIG } from './config';
import { ModelRouteConfig, TokenUsageReport } from './types';

export class TokenBudgetService {
  /**
   * Fast, reliable token estimation:
   * Standard English & transliterated Indic text averages ~4 characters per token.
   * Devanagari script averages ~2 characters per token.
   */
  public estimateTokenCount(text: string): number {
    if (!text || text.length === 0) return 0;
    // Check for Devanagari Unicode range (\u0900-\u097F)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    const charsPerToken = hasDevanagari ? 2.5 : 3.8;
    return Math.max(1, Math.ceil(text.length / charsPerToken));
  }

  /**
   * Sanitizes prompt input:
   * - Trims excess whitespace
   * - Strips control characters
   * - Enforces maximum length constraints
   */
  public sanitizeInput(input: string): { cleanPrompt: string; estimatedTokens: number; error?: string } {
    if (!input || typeof input !== 'string') {
      return { cleanPrompt: '', estimatedTokens: 0, error: 'Input prompt must be a non-empty string.' };
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { cleanPrompt: '', estimatedTokens: 0, error: 'Input prompt cannot be empty.' };
    }

    if (trimmed.length > GATEWAY_CONFIG.MAX_PROMPT_CHARS) {
      return {
        cleanPrompt: trimmed.slice(0, GATEWAY_CONFIG.MAX_PROMPT_CHARS),
        estimatedTokens: this.estimateTokenCount(trimmed),
        error: `Input prompt exceeds the maximum allowed character limit (${GATEWAY_CONFIG.MAX_PROMPT_CHARS} characters).`,
      };
    }

    // Strip unsafe null bytes and control chars
    const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const estimated = this.estimateTokenCount(sanitized);

    return { cleanPrompt: sanitized, estimatedTokens: estimated };
  }

  /**
   * Validates if the input prompt fits within the workflow's allowed input token budget.
   */
  public validateInputBudget(
    prompt: string,
    routeConfig: ModelRouteConfig
  ): { valid: boolean; estimatedInputTokens: number; error?: string } {
    const { cleanPrompt, estimatedTokens, error } = this.sanitizeInput(prompt);
    if (error) {
      return { valid: false, estimatedInputTokens: estimatedTokens, error };
    }

    if (estimatedTokens > routeConfig.maxInputTokens) {
      return {
        valid: false,
        estimatedInputTokens: estimatedTokens,
        error: `Input size (~${estimatedTokens} tokens) exceeds the allocated token budget for ${routeConfig.workflow} (max ${routeConfig.maxInputTokens} tokens). Please shorten the prompt or context.`,
      };
    }

    return { valid: true, estimatedInputTokens: estimatedTokens };
  }

  /**
   * Extracts token report from actual provider response metadata when available,
   * otherwise falls back to estimated calculation.
   */
  public extractUsageReport(
    geminiResponse: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } } | null | undefined,
    prompt: string,
    outputText: string
  ): TokenUsageReport {
    if (geminiResponse && geminiResponse.usageMetadata) {
      const u = geminiResponse.usageMetadata;
      const promptTokens = u.promptTokenCount ?? this.estimateTokenCount(prompt);
      const completionTokens = u.candidatesTokenCount ?? this.estimateTokenCount(outputText);
      const totalTokens = u.totalTokenCount ?? (promptTokens + completionTokens);
      return {
        promptTokens,
        completionTokens,
        totalTokens,
      };
    }

    const promptTokens = this.estimateTokenCount(prompt);
    const completionTokens = this.estimateTokenCount(outputText);
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
}

export const tokenBudgetService = new TokenBudgetService();
