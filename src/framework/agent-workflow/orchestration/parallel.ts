/**
 * Parallel Step Executor
 *
 * Executes a ParallelStep - runs branches concurrently using Promise.all.
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { ParallelStep, WorkflowStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';

/**
 * Execute a Parallel step - run branches concurrently.
 * Uses Promise.all for WDK-native parallel execution.
 */
export async function executeParallelStep(
  step: ParallelStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext,
  // Recursive executor function (injected to avoid circular dep)
  executeStep: (
    step: WorkflowStep,
    ctx: OrchestrationContext,
    execCtx: StepExecutionContext
  ) => Promise<void>
): Promise<void> {
  console.log(`[Orchestration] Executing ${step.branches.length} parallel branches`);

  // Run all branches in parallel using Promise.all (WDK-native pattern)
  await Promise.all(
    step.branches.map(async (branchSteps) => {
      // Each branch executes its steps sequentially
      for (const branchStep of branchSteps) {
        await executeStep(branchStep, ctx, execCtx);
      }
    })
  );

  console.log(`[Orchestration] All parallel branches completed`);
}
