/**
 * Transform Step Executor
 *
 * Wrapper for transform step execution with progress reporting.
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { TransformStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';
import { resolveInputMap, createProgressField } from '../helpers';
import { writeProgressStep, executeTransformStep } from '../steps';

/**
 * Execute a Transform step with progress reporting.
 */
export async function executeTransformStepWrapper(
  step: TransformStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext
): Promise<void> {
  const { writable } = execCtx;

  console.log(`[Orchestration] Executing transform: ${step.transformId}`);

  // Write progress using step function (WDK requirement)
  await writeProgressStep(
    writable,
    createProgressField(
      `transform:${step.transformId}`,
      `Running ${step.transformId}...`,
      50,
      'analyze'
    )
  );

  const resolvedInput = resolveInputMap(step.inputMap, ctx);
  const result = await executeTransformStep(step.transformId, JSON.stringify(resolvedInput));

  ctx.artifacts[step.storeKey] = result;
  console.log(
    `[Orchestration] Transform ${step.transformId} completed, stored in artifacts.${step.storeKey}`
  );
}
