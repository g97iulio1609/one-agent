/**
 * OneAgent SDK 4.2 - Base Agent
 *
 * Abstract base class following SOLID principles
 * - Single Responsibility: Handles agent execution flow
 * - Open/Closed: Open for extension via inheritance
 * - Liskov Substitution: All agents can be used interchangeably
 * - Interface Segregation: Clean, focused interfaces
 * - Dependency Inversion: Depends on abstractions (IAIProvider, IPromptBuilder)
 */

import { z } from 'zod';
import type {
  IAgent,
  IAIProvider,
  IPromptBuilder,
  ICostCalculator,
  AgentConfig,
  AgentResult,
  AgentError,
  StreamEvent,
} from './types';

export abstract class BaseAgent<TInput, TOutput> implements IAgent<TInput, TOutput> {
  protected readonly config: AgentConfig<TInput, TOutput>;
  protected readonly aiProvider: IAIProvider;
  protected readonly promptBuilder: IPromptBuilder<TInput>;
  protected readonly costCalculator: ICostCalculator;

  constructor(
    config: AgentConfig<TInput, TOutput>,
    aiProvider: IAIProvider,
    promptBuilder: IPromptBuilder<TInput>,
    costCalculator: ICostCalculator
  ) {
    this.config = config;
    this.aiProvider = aiProvider;
    this.promptBuilder = promptBuilder;
    this.costCalculator = costCalculator;
  }

  /**
   * Generate output from input (main execution method)
   */
  async generate(input: TInput): Promise<AgentResult<TOutput>> {
    try {
      // Validate input
      const validatedInput = this.config.inputSchema.parse(input);

      // Build prompts
      const systemPrompt = this.promptBuilder.buildSystemPrompt();
      const userPrompt = this.promptBuilder.buildUserPrompt(validatedInput);

      // Generate with AI
      const result = await this.aiProvider.generateStructuredOutput({
        model: this.config.model,
        schema: this.config.outputSchema,
        prompt: userPrompt,
        systemPrompt,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Validate output
      const validatedOutput = this.config.outputSchema.parse(result.output);

      // Use cost from OpenRouter Usage Accounting if available, otherwise calculate manually
      const costUSD =
        result.usage.costUSD ??
        this.costCalculator.calculateCost(this.config.model, result.usage.totalTokens);

      // Extract summary and recommendations
      const { summary, warnings, recommendations } = this.extractMetadata(validatedOutput);

      return {
        output: validatedOutput,
        summary,
        warnings,
        recommendations,
        tokensUsed: result.usage.totalTokens,
        costUSD,
        generatedAt: new Date(),
      };
    } catch (error: unknown) {
      throw this.handleError(error);
    }
  }

  /**
   * Stream output generation (for real-time updates)
   */
  async *stream(input: TInput): AsyncGenerator<StreamEvent<TOutput>> {
    try {
      yield { type: 'start', data: { timestamp: new Date() } };

      const validatedInput = this.config.inputSchema.parse(input);

      yield {
        type: 'progress',
        data: { message: 'Building prompt...', percentage: 10 },
      };

      const systemPrompt = this.promptBuilder.buildSystemPrompt();
      const userPrompt = this.promptBuilder.buildUserPrompt(validatedInput);

      yield {
        type: 'progress',
        data: { message: 'Generating with AI...', percentage: 30 },
      };

      let streamError: unknown | null = null;

      const streamResult = this.aiProvider.streamStructuredOutput({
        model: this.config.model,
        schema: this.config.outputSchema,
        prompt: userPrompt,
        systemPrompt,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        onError: (error) => {
          streamError = error;
        },
      });

      for await (const partial of streamResult.partialOutputStream) {
        yield { type: 'partial', data: { output: partial } };
      }

      if (streamError) {
        throw streamError;
      }

      yield {
        type: 'progress',
        data: { message: 'Finalizing output...', percentage: 90 },
      };

      const output = await streamResult.output;
      const usage = await streamResult.usage;
      const validatedOutput = this.config.outputSchema.parse(output);

      const costUSD =
        usage.costUSD ??
        this.costCalculator.calculateCost(this.config.model, usage.totalTokens || 0);

      const { summary, warnings, recommendations } = this.extractMetadata(validatedOutput);

      yield {
        type: 'complete',
        data: {
          output: validatedOutput,
          summary,
          warnings,
          recommendations,
          tokensUsed: usage.totalTokens || 0,
          costUSD,
          generatedAt: new Date(),
        },
      };
    } catch (error: unknown) {
      const agentError = this.handleError(error);
      yield { type: 'error', data: agentError };
    }
  }

  /**
   * Validate data against output schema
   */
  validate(data: unknown): data is TOutput {
    try {
      this.config.outputSchema.parse(data);
      return true;
    } catch (_error: unknown) {
      return false;
    }
  }

  /**
   * Extract metadata from output (to be implemented by subclasses)
   */
  protected abstract extractMetadata(output: TOutput): {
    summary: string;
    warnings: string[];
    recommendations: string[];
  };

  /**
   * Handle errors (can be overridden by subclasses)
   */
  protected handleError(error: unknown): AgentError {
    if (error instanceof z.ZodError) {
      return {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.issues,
        recoverable: false,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'AGENT_ERROR',
        details: error,
        recoverable: true,
      };
    }

    return {
      message: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      details: error,
      recoverable: false,
    };
  }
}
