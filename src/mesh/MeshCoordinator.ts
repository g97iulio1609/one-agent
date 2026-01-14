/**
 * Mesh Coordinator
 *
 * Orchestrates multiple specialized agents in a mesh architecture
 * Handles delegation, collaboration, validation loops, and retry logic
 */

import { randomUUID } from 'node:crypto';
import { MeshAgent } from './MeshAgent';
import {
  AgentRole,
  type AgentTask,
  type AgentExecution,
  type CollaborationRequest,
  type MeshAgentConfig,
  type OrchestrationResult,
  type SharedContext,
  type MeshEvent,
  type ValidationResult,
  type MeshAgentResult,
} from './types';
import type { AgentError } from '../core/types';
import { getPerformanceMonitor, type PerformanceMonitor } from './PerformanceMonitor';

/**
 * Coordinator configuration
 * Omits role, expertise, canDelegate, priority since coordinator sets these
 */
export interface CoordinatorConfig<TInput, TOutput> extends Omit<
  MeshAgentConfig<TInput, TOutput>,
  'role' | 'expertise' | 'canDelegate' | 'priority'
> {
  maxRetries?: number;
  validationEnabled?: boolean;
  parallelExecution?: boolean;
}

/**
 * Mesh Coordinator
 * Orchestrates mesh of specialized agents
 */
export abstract class MeshCoordinator<TInput, TOutput> extends MeshAgent<TInput, TOutput> {
  protected subAgents: Map<AgentRole, MeshAgent<unknown, unknown>> = new Map();
  protected readonly maxRetries: number;
  protected readonly validationEnabled: boolean;
  protected readonly parallelExecution: boolean;
  protected readonly performanceMonitor: PerformanceMonitor;

  constructor(config: CoordinatorConfig<TInput, TOutput>) {
    super({
      ...config,
      role: AgentRole.COORDINATOR,
      expertise: ['orchestration', 'delegation', 'coordination'],
      canDelegate: true,
      priority: 10,
    });

    this.maxRetries = config.maxRetries ?? 3;
    this.validationEnabled = config.validationEnabled ?? true;
    this.parallelExecution = config.parallelExecution ?? false;
    this.performanceMonitor = getPerformanceMonitor();
  }

  /**
   * Register sub-agent
   */
  registerAgent<TAgentInput, TAgentOutput>(agent: MeshAgent<TAgentInput, TAgentOutput>): void {
    this.subAgents.set(agent.getRole(), agent as MeshAgent<unknown, unknown>);
  }

  /**
   * Delegate task to specific agent
   */
  protected override async delegate<TTaskInput, TTaskOutput>(
    task: AgentTask<TTaskInput, TTaskOutput>
  ): Promise<MeshAgentResult<TTaskOutput>> {
    const agent = this.subAgents.get(task.role);

    if (!agent) {
      throw new Error(`Agent not found for role: ${task.role}`);
    }

    // Emit delegation event
    this.emitEvent({
      type: 'delegation',
      data: {
        from: this.role,
        to: task.role,
        task: task.description,
      },
    });

    // Execute with retry logic if task is retryable
    let lastError: AgentError | undefined;
    const maxAttempts = task.retryable ? this.maxRetries : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Emit agent start
        const startTime = Date.now();
        this.emitEvent({
          type: 'agent_start',
          data: {
            role: task.role,
            description: task.description,
          },
        });

        // Execute task with performance tracking and timeout
        const executeTask = async () => {
          if (task.timeout) {
            return Promise.race([
              agent.execute(task.input, this.sharedContext),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`Agent ${task.role} timed out after ${task.timeout}ms`)),
                  task.timeout
                )
              ),
            ]);
          }
          return agent.execute(task.input, this.sharedContext);
        };

        const result = await this.performanceMonitor.measure(`agent:${task.role}`, executeTask, {
          description: task.description,
          attempt,
        });

        // Calculate actual duration
        const duration = Date.now() - startTime;

        // Emit agent complete with actual duration and output
        this.emitEvent({
          type: 'agent_complete',
          data: {
            role: task.role,
            duration,
            output: result.output, // Include agent output
            tokensUsed: result.tokensUsed,
            costUSD: result.costUSD,
          },
        });

        return result as MeshAgentResult<TTaskOutput>;
      } catch (error: unknown) {
        lastError = this.handleError(error);

        // Emit agent error
        this.emitEvent({
          type: 'agent_error',
          data: {
            role: task.role,
            error: lastError,
            retrying: attempt < maxAttempts,
          },
        });

        // Retry if not last attempt
        if (attempt < maxAttempts) {
          this.emitEvent({
            type: 'retry',
            data: {
              role: task.role,
              attempt,
              maxAttempts,
            },
          });

          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Agent ${task.role} failed after ${maxAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Collaborate with multiple agents
   */
  protected override async collaborate(
    request: CollaborationRequest
  ): Promise<Record<AgentRole, unknown>> {
    // Emit collaboration event
    this.emitEvent({
      type: 'collaboration',
      data: {
        agents: request.collaboratorRoles,
        task: request.task,
      },
    });

    const results: Partial<Record<AgentRole, unknown>> = {};

    // Execute collaborators (parallel or sequential based on config)
    if (this.parallelExecution) {
      // Parallel execution
      const promises = request.collaboratorRoles.map(async (role) => {
        const agent = this.subAgents.get(role);
        if (!agent) {
          throw new Error(`Collaborator not found: ${role}`);
        }

        const result = await agent.execute(request.sharedData, this.sharedContext);
        return { role, result };
      });

      const settled = await Promise.allSettled(promises);

      settled.forEach(
        (outcome: PromiseSettledResult<{ role: AgentRole; result: MeshAgentResult<unknown> }>) => {
          if (outcome.status === 'fulfilled') {
            const role = outcome.value.role;
            results[role] = outcome.value.result.output;
          }
        }
      );
    } else {
      // Sequential execution
      for (const role of request.collaboratorRoles) {
        const agent = this.subAgents.get(role);
        if (!agent) {
          throw new Error(`Collaborator not found: ${role}`);
        }

        const result = await agent.execute(request.sharedData, this.sharedContext);
        results[role] = result.output;
      }
    }

    return results as Record<AgentRole, unknown>;
  }

  /**
   * Initialize shared context
   */
  protected initializeContext(input: TInput): SharedContext {
    return {
      requestId: randomUUID(),
      input,
      userId: '', // To be set by caller
      partialResults: {},
      executionHistory: [],
      currentStep: 'initialization',
      metadata: {
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      needsRetry: false,
      retryCount: 0,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * Execute orchestration (to be implemented by subclasses)
   */
  abstract orchestrate(input: TInput): Promise<OrchestrationResult<TOutput>>;

  /**
   * Execute orchestration with streaming
   */
  abstract orchestrateStream(input: TInput): AsyncGenerator<MeshEvent<TOutput>>;

  /**
   * Execute with context (MeshAgent interface)
   */
  async executeWithContext(
    input: TInput,
    context: SharedContext
  ): Promise<MeshAgentResult<TOutput>> {
    this.sharedContext = context;
    const result = await this.orchestrate(input);

    if (!result.success || !result.output) {
      throw result.error || new Error('Orchestration failed');
    }

    return {
      output: result.output,
      tokensUsed: result.executionSummary.totalTokens,
      costUSD: result.executionSummary.totalCost,
    };
  }

  /**
   * Build final orchestration result
   */
  protected buildOrchestrationResult(
    output: TOutput,
    startTime: Date
  ): OrchestrationResult<TOutput> {
    const totalDuration = Date.now() - startTime.getTime();
    const totalTokens =
      this.sharedContext?.executionHistory.reduce(
        (sum: number, exec: AgentExecution) => sum + (exec.tokensUsed || 0),
        0
      ) || 0;
    const totalCost =
      this.sharedContext?.executionHistory.reduce(
        (sum: number, exec: AgentExecution) => sum + (exec.cost || 0),
        0
      ) || 0;

    return {
      success: true,
      output,
      executionSummary: {
        totalDuration,
        totalTokens,
        totalCost,
        agentExecutions: this.sharedContext?.executionHistory || [],
        retryCount: this.sharedContext?.retryCount || 0,
        validationPasses: this.getValidationPassCount(),
      },
    };
  }

  /**
   * Get validation pass count from execution history
   */
  protected getValidationPassCount(): number {
    return (
      this.sharedContext?.executionHistory.filter(
        (exec: AgentExecution) => exec.agentRole === AgentRole.VALIDATION && exec.success
      ).length || 0
    );
  }

  /**
   * Emit event (for streaming)
   */
  protected emitEvent(_event: MeshEvent<TOutput>): void {
    // To be overridden for streaming implementation
  }

  /**
   * Validate output using ValidationAgent
   */
  protected async validate(output: unknown): Promise<ValidationResult> {
    const validationAgent = this.subAgents.get(AgentRole.VALIDATION);

    if (!validationAgent || !this.validationEnabled) {
      // Skip validation
      return {
        isValid: true,
        issues: [],
        score: 100,
        suggestions: [],
      };
    }

    const result = await validationAgent.execute(output, this.sharedContext);

    const validationResult = result.output as ValidationResult;

    // Emit validation event
    this.emitEvent({
      type: 'validation',
      data: validationResult,
    });

    return validationResult;
  }

  /**
   * Sleep utility for retry backoff
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
