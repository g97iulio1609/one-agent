/**
 * OneAgent SDK v4.1 - Durable Agent Workflow
 *
 * Main workflow function with streaming & Manager orchestration.
 * This file is intentionally kept minimal - all logic is delegated to specialized modules.
 *
 * KEY FEATURES:
 * - Worker agents: Execute with ToolLoopAgent + streaming
 * - Manager agents: Orchestrate WORKFLOW.md steps with WDK-native patterns
 * - Nested Managers: Child workflows with stream piping
 * - WDK-native retry: maxRetries, RetryableError, FatalError
 *
 * ARCHITECTURE (SOLID Principles):
 * - Single Responsibility: Each module handles one concern
 * - Open/Closed: Easy to add new step types via orchestration/
 * - Dependency Inversion: Uses interfaces, not concrete implementations
 *
 * WDK SERIALIZATION:
 * - All step return values must be serializable (no Zod schemas, no functions)
 * - loadManifestStep returns SerializableManifestInfo, not full AgentManifest
 * - Steps that need full manifest load it internally
 *
 * @see https://useworkflow.dev/docs/foundations/streaming
 * @see https://useworkflow.dev/docs/foundations/serialization
 * @see https://useworkflow.dev/docs/foundations/errors-and-retries
 * @since v4.0 - Initial durable execution
 * @since v4.1 - Added Manager orchestration with WDK-native patterns
 * @since v4.2 - Refactored to modular structure (KISS/DRY/SOLID), fixed serialization
 */

import { getWritable, FatalError } from 'workflow';
import type { UIMessageChunk } from 'ai';

import type {
  AgentWorkflowParams,
  AgentWorkflowResult,
  OrchestrationContext,
  StepExecutionContext,
  SerializableManifestInfo,
} from './types';
import { getNestedValue, createProgressField } from './helpers';
import {
  loadManifestStep,
  executeWorkerStep,
  writeProgressStep,
  writeFinishStep,
  closeStreamStep,
} from './steps';
import { executeWorkflowStep } from './orchestration';

/**
 * Durable agent workflow function with streaming and Manager orchestration.
 *
 * This function is marked with "use workflow" to enable WDK durability.
 * The WDK compiler will transform this into a durable workflow that:
 * - Persists state to the configured World (Postgres)
 * - Can resume after crashes/restarts
 * - Provides observability via the WDK dashboard
 * - Streams progress via getWritable()
 *
 * WORKFLOW EXECUTION:
 * - Worker agents: Execute with ToolLoopAgent + streaming (existing behavior)
 * - Manager agents: Orchestrate WORKFLOW.md steps with WDK-native patterns
 * - Nested Managers: Launch child workflows with stream piping
 */
export async function agentWorkflow(params: AgentWorkflowParams): Promise<AgentWorkflowResult> {
  'use workflow';

  const startTime = Date.now();
  let tokensUsed = 0;

  // Get the writable stream in the workflow (WDK requirement)
  const writable = getWritable<UIMessageChunk>();

  try {
    // 1. Load manifest info to determine agent type (Manager or Worker)
    // NOTE: Returns SerializableManifestInfo, NOT full AgentManifest (Zod schemas not serializable)
    console.log(`[AgentWorkflow] Loading manifest for: ${params.agentId}`);
    const manifestInfo = await loadManifestStep(params.agentId, params.basePath);

    // 2. Check if Worker or Manager
    if (!manifestInfo.hasWorkflow) {
      // === WORKER MODE ===
      return await executeWorkerMode(writable, params, startTime);
    }

    // === MANAGER MODE ===
    return await executeManagerMode(writable, params, manifestInfo, startTime, tokensUsed);
  } catch (error) {
    console.error(`[AgentWorkflow] Workflow failed:`, error);

    // Ensure stream is closed on error
    try {
      await closeStreamStep(writable);
    } catch {
      // Ignore close errors
    }

    const errorCode = error instanceof FatalError ? 'FATAL_ERROR' : 'WORKFLOW_EXECUTION_FAILED';

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: errorCode,
      },
      meta: {
        duration: Date.now() - startTime,
        tokensUsed: 0,
        costUSD: 0,
      },
    };
  }
}

/**
 * Execute workflow in Worker mode (simple agent execution).
 */
async function executeWorkerMode(
  writable: WritableStream<UIMessageChunk>,
  params: AgentWorkflowParams,
  startTime: number
): Promise<AgentWorkflowResult> {
  console.log(`[AgentWorkflow] ${params.agentId} is a Worker, executing directly`);

  const result = await executeWorkerStep(
    writable,
    params.agentId,
    params.basePath,
    params.inputJson,
    params.userId
  );

  await closeStreamStep(writable);

  return {
    success: true,
    output: result.object,
    meta: {
      duration: Date.now() - startTime,
      tokensUsed: result.usage?.totalTokens ?? 0,
      costUSD: 0,
    },
  };
}

/**
 * Execute workflow in Manager mode (orchestrates sub-agents).
 *
 * @param manifestInfo - Serializable manifest info (no Zod schemas)
 */
async function executeManagerMode(
  writable: WritableStream<UIMessageChunk>,
  params: AgentWorkflowParams,
  manifestInfo: SerializableManifestInfo,
  startTime: number,
  tokensUsed: number
): Promise<AgentWorkflowResult> {
  console.log(
    `[AgentWorkflow] ${params.agentId} is a Manager with ${manifestInfo.workflow!.steps.length} workflow steps`
  );

  // Initialize orchestration context
  const ctx: OrchestrationContext = {
    artifacts: { input: JSON.parse(params.inputJson) },
    input: JSON.parse(params.inputJson),
  };

  // Create execution context with serializable manifest info
  const execCtx: StepExecutionContext = {
    writable,
    manifestInfo,
    params,
  };

  // Write initial progress
  await writeProgressStep(
    writable,
    createProgressField('workflow:start', 'Starting workflow...', 5, 'loading')
  );

  // Execute workflow steps
  const totalSteps = manifestInfo.workflow!.steps.length;
  for (let i = 0; i < totalSteps; i++) {
    const step = manifestInfo.workflow!.steps[i];

    // Update progress based on step position
    const stepProgress = Math.round(10 + (i / totalSteps) * 80);
    await writeProgressStep(
      writable,
      createProgressField(
        `workflow:step:${i + 1}`,
        `Step ${i + 1}/${totalSteps}: ${step.name}`,
        stepProgress,
        'loading'
      )
    );

    await executeWorkflowStep(step, ctx, execCtx, agentWorkflow);
  }

  // Handle output
  let output: unknown;

  if (manifestInfo.config.skipSynthesis) {
    const outputKey = manifestInfo.config.outputArtifact || '_output';
    console.log(`[AgentWorkflow] skipSynthesis=true, using artifact: ${outputKey}`);

    output = getNestedValue(ctx.artifacts, outputKey);

    if (output === undefined) {
      throw new FatalError(
        `skipSynthesis: artifact "${outputKey}" not found. Available: ${Object.keys(ctx.artifacts).join(', ')}`
      );
    }
  } else {
    // Synthesize output using Worker pattern
    console.log(`[AgentWorkflow] Synthesizing final output with Manager agent`);

    await writeProgressStep(
      writable,
      createProgressField('workflow:synthesis', 'Synthesizing final output...', 90, 'analyze')
    );

    const synthResult = await executeWorkerStep(
      writable,
      params.agentId,
      params.basePath,
      JSON.stringify(ctx.artifacts),
      params.userId,
      'synthesis'
    );

    output = synthResult.object;
    tokensUsed += synthResult.usage?.totalTokens ?? 0;
  }

  // Write final completion
  await writeProgressStep(
    writable,
    createProgressField('workflow:complete', 'Workflow complete!', 100, 'success')
  );

  await writeFinishStep(writable, output);
  await closeStreamStep(writable);

  console.log(`[AgentWorkflow] Manager workflow completed successfully`);

  return {
    success: true,
    output,
    meta: {
      duration: Date.now() - startTime,
      tokensUsed,
      costUSD: 0,
    },
  };
}
