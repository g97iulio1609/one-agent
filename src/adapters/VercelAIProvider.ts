/**
 * OneAgent SDK 4.2 - Vercel AI Provider
 *
 * Native adapter for Vercel AI SDK
 * Following Dependency Inversion Principle
 */

import { generateText, Output, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import type { z } from 'zod';
import type { IAIProvider } from '../core/types';

/**
 * Model registry for Vercel AI SDK
 */
const MODEL_PROVIDERS = {
  'gpt-4o': openai('gpt-4o'),
  'gpt-4o-mini': openai('gpt-4o-mini'),
  'gpt-4-turbo': openai('gpt-4-turbo'),
  'claude-3-5-sonnet-20241022': anthropic('claude-3-5-sonnet-20241022'),
  'claude-3-5-haiku-20241022': anthropic('claude-3-5-haiku-20241022'),
  'claude-3-opus-20240229': anthropic('claude-3-opus-20240229'),
} as const;

type SupportedModel = keyof typeof MODEL_PROVIDERS;

/**
 * Native Vercel AI provider implementation
 */
export class VercelAIProvider implements IAIProvider {
  constructor(_apiKeys: { openai?: string; anthropic?: string }) {
    // API keys are used by the SDK providers directly via environment variables
  }

  /**
   * Generate structured object using Vercel AI SDK
   * Supports abortSignal for timeout control (AI SDK v6 native feature)
   */
  async generateStructuredOutput<T>(params: {
    model: string;
    schema: z.ZodSchema<T>;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
    abortSignal?: AbortSignal;
  }): Promise<{ output: T; usage: { totalTokens: number } }> {
    const modelProvider = this.getModelProvider(params.model);

    const result = await generateText({
      model: modelProvider,
      output: Output.object({ schema: params.schema }),
      system: params.systemPrompt,
      prompt: params.prompt,
      abortSignal: params.abortSignal,
      // Note: maxTokens not supported in AI SDK 6 beta
    });

    return {
      output: result.output as T,
      usage: {
        totalTokens: result.usage.totalTokens || 0,
      },
    };
  }

  /**
   * Generate text using Vercel AI SDK
   */
  async generateText(params: {
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens: number;
  }): Promise<{ text: string; usage: { totalTokens: number } }> {
    const modelProvider = this.getModelProvider(params.model);

    const result = await generateText({
      model: modelProvider,
      prompt: params.prompt,
      // temperature removed as per request
      // Note: maxTokens not supported in AI SDK 6 beta
    });

    return {
      text: result.text,
      usage: {
        totalTokens: result.usage.totalTokens || 0,
      },
    };
  }

  /**
   * Stream text generation using Vercel AI SDK
   */
  async *streamText(params: {
    model: string;
    prompt: string;
    temperature?: number;
    maxTokens: number;
  }): AsyncIterable<string> {
    const modelProvider = this.getModelProvider(params.model);

    const result = streamText({
      model: modelProvider,
      prompt: params.prompt,
      // temperature removed as per request
      // Note: maxTokens not supported in AI SDK 6 beta
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  /**
   * Get model provider from model string
   */
  private getModelProvider(model: string) {
    if (!(model in MODEL_PROVIDERS)) {
      throw new Error(
        `Unsupported model: ${model}. Supported models: ${Object.keys(MODEL_PROVIDERS).join(', ')}`
      );
    }

    return MODEL_PROVIDERS[model as SupportedModel];
  }

  streamStructuredOutput<T>(params: {
    model: string;
    schema: z.ZodSchema<T>;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens: number;
    onLog?: (message: string, metadata?: unknown) => void;
    abortSignal?: AbortSignal;
    onError?: (error: unknown) => void;
  }): {
    partialOutputStream: AsyncIterable<Partial<T>>;
    output: Promise<T>;
    usage: Promise<{ totalTokens: number; costUSD?: number }>;
  } {
    const modelProvider = this.getModelProvider(params.model);

    const result = streamText({
      model: modelProvider,
      output: Output.object({ schema: params.schema }),
      system: params.systemPrompt,
      prompt: params.prompt,
      abortSignal: params.abortSignal,
      onError({ error }: { error: unknown }) {
        params.onError?.(error);
      },
      // Note: maxTokens not supported in AI SDK 6 beta
    });

    const usage: Promise<{ totalTokens: number; costUSD?: number }> = Promise.resolve(
      result.usage
    ).then((u) => {
      params.onLog?.('VercelAIProvider usage', u as Record<string, unknown>);
      return { totalTokens: u.totalTokens ?? 0 };
    });

    return {
      partialOutputStream: result.partialOutputStream as AsyncIterable<Partial<T>>,
      output: Promise.resolve(result.output) as Promise<T>,
      usage,
    };
  }
}

/**
 * Create Vercel AI provider with API keys from environment
 */
export function createVercelAIProvider(): VercelAIProvider {
  return new VercelAIProvider({
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  });
}
