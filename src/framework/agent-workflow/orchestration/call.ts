/**
 * Call Step Executor
 *
 * Executes a CallStep - invokes a sub-agent (Worker or Manager).
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 * @since v4.2 - Uses manifestInfo instead of parentManifest for WDK serialization
 */

import type { CallStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';
import { resolveInputMap, normalizeWorkerPath } from '../helpers';
import { loadManifestStep, executeWorkerStep, executeNestedManagerStep } from '../steps';

/**
 * Execute a Call step - invoke a sub-agent (Worker or Manager).
 */
export async function executeCallStep(
  step: CallStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext,
  // Forward reference to main workflow function (avoids circular dep)
  agentWorkflow: Parameters<typeof executeNestedManagerStep>[6]
): Promise<void> {
  const { writable, manifestInfo, params } = execCtx;

  console.log(`[Orchestration] Calling sub-agent: ${step.agentId}`);

  // Resolve input from templates
  const resolvedInput = resolveInputMap(step.inputMap, ctx);
  const inputJson = JSON.stringify(resolvedInput);

  // Load sub-agent manifest to check if Manager
  const subAgentPath = normalizeWorkerPath(step.agentId);
  const subManifestInfo = await loadManifestStep(subAgentPath, manifestInfo.path);

  try {
    let result: unknown;

    if (subManifestInfo.hasWorkflow) {
      // Nested Manager - use child workflow
      console.log(
        `[Orchestration] Sub-agent ${step.agentId} is a Manager, launching nested workflow`
      );
      result = await executeNestedManagerStep(
        writable,
        step.agentId,
        manifestInfo.path,
        inputJson,
        params.userId ?? 'anonymous',
        params.executionId,
        agentWorkflow
      );
    } else {
      // Worker - execute directly
      console.log(`[Orchestration] Sub-agent ${step.agentId} is a Worker, executing directly`);
      const workerResult = await executeWorkerStep(
        writable,
        subAgentPath,
        manifestInfo.path,
        inputJson,
        params.userId,
        step.agentId // stepPrefix for progress
      );
      result = workerResult.object;
    }

    ctx.artifacts[step.storeKey] = result;
    console.log(`[Orchestration] Stored result in artifacts.${step.storeKey}`);
  } catch (error) {
    // Handle retry.onFailure strategy
    const retryConfig = step.retry ?? { maxAttempts: 1, onFailure: 'abort' as const };

    if (retryConfig.onFailure === 'continue') {
      console.warn(`[Orchestration] Agent ${step.agentId} failed, continuing with fallback`);
      ctx.artifacts[step.storeKey] = retryConfig.fallbackStore
        ? ctx.artifacts[retryConfig.fallbackStore]
        : null;
      ctx.artifacts[`${step.storeKey}_error`] =
        error instanceof Error ? error.message : String(error);
    } else {
      // onFailure: 'abort' - rethrow to stop workflow
      throw error;
    }
  }
}
