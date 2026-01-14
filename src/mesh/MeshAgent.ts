/**
 * Mesh Agent Base Class
 *
 * Base class for agents in mesh architecture
 * Adds delegation, collaboration, and shared context capabilities
 */

import type {
  AgentRole,
  AgentTask,
  CollaborationRequest,
  MeshAgentConfig,
  SharedContext,
  AgentExecution,
  MeshAgentResult,
} from './types';
import type { IAIProvider, ICostCalculator, AgentError } from '../core/types';
import { z } from 'zod';

/**
 * Abstract base class for mesh agents
 * Simplified version that works with mesh architecture
 */
export abstract class MeshAgent<TInput, TOutput> {
  protected readonly config: MeshAgentConfig<TInput, TOutput>;
  protected readonly aiProvider: IAIProvider;
  protected readonly costCalculator: ICostCalculator;
  protected readonly role: AgentRole;
  protected readonly expertise: string[];
  protected readonly canDelegate: boolean;
  protected readonly collaborators: AgentRole[];
  protected readonly priority: number;
  protected sharedContext?: SharedContext;
  protected readonly onLog?: (message: string, metadata?: unknown) => void;

  constructor(config: MeshAgentConfig<TInput, TOutput>) {
    this.config = config;
    this.aiProvider = config.aiProvider;
    this.costCalculator = config.costCalculator;
    this.role = config.role;
    this.expertise = config.expertise;
    this.canDelegate = config.canDelegate;
    this.collaborators = config.collaborators || [];
    this.priority = config.priority;
    this.onLog = config.onLog;
  }

  /**
   * Execute agent with shared context
   * Override to implement agent-specific logic
   */
  abstract executeWithContext(
    input: TInput,
    context: SharedContext
  ): Promise<MeshAgentResult<TOutput>>;

  /**
   * Execute wrapper that manages shared context
   */
  async execute(input: TInput, context?: SharedContext): Promise<MeshAgentResult<TOutput>> {
    // Record start of execution
    const execution: AgentExecution = {
      agentRole: this.role,
      startedAt: new Date(),
      success: false,
      retries: 0,
    };

    try {
      // Use shared context if provided
      if (context) {
        this.sharedContext = context;

        // Add execution to history
        context.executionHistory.push(execution);
        context.currentStep = this.role;
        context.metadata.lastUpdatedAt = new Date();

        // Execute with context
        const result = await this.executeWithContext(input, context);

        // Record completion
        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        execution.tokensUsed = result.tokensUsed;
        execution.cost = result.costUSD;
        execution.success = true;

        return result;
      } else {
        // Execute without context
        const result = await this.executeWithContext(input, {} as SharedContext);

        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        execution.success = true;

        return result;
      }
    } catch (error: unknown) {
      // Record error
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.success = false;
      execution.error = this.handleError(error);

      throw error;
    }
  }

  /**
   * Delegate task to another agent
   * To be implemented by coordinator
   */
  protected async delegate<TTaskOutput>(
    _task: AgentTask<unknown, TTaskOutput>
  ): Promise<MeshAgentResult<TTaskOutput>> {
    throw new Error('Delegation not implemented. Only coordinator can delegate.');
  }

  /**
   * Request collaboration from other agents
   * To be implemented by coordinator
   */
  protected async collaborate(_request: CollaborationRequest): Promise<Record<AgentRole, unknown>> {
    throw new Error('Collaboration not implemented. Only coordinator can manage collaboration.');
  }

  /**
   * Get data from shared context
   */
  protected getContextData<T>(key: string): T | undefined {
    if (!this.sharedContext) {
      return undefined;
    }

    return (this.sharedContext.partialResults as Record<string, T>)[key];
  }

  /**
   * Set data in shared context
   */
  protected setContextData<T>(key: string, value: T): void {
    if (!this.sharedContext) {
      return;
    }

    (this.sharedContext.partialResults as Record<string, unknown>)[key] = value;
  }

  /**
   * Check if agent has specific expertise
   */
  hasExpertise(domain: string): boolean {
    return this.expertise.includes(domain);
  }

  /**
   * Get agent role
   */
  getRole(): AgentRole {
    return this.role;
  }

  /**
   * Check if agent can collaborate with another
   */
  canCollaborateWith(otherRole: AgentRole): boolean {
    return this.collaborators.includes(otherRole);
  }

  /**
   * Get agent priority
   */
  getPriority(): number {
    return this.priority;
  }

  /**
   * Handle errors
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
