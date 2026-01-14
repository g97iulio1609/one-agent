/**
 * Loop Step Executor
 *
 * Executes a LoopStep - iterates over array (parallel or sequential).
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { LoopStep, CallStep, WorkflowStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';
import { resolveTemplate } from '../helpers';

/**
 * Execute a Loop step - iterate over array (parallel or sequential).
 */
export async function executeLoopStep(
  step: LoopStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext,
  // Recursive executor function (injected to avoid circular dep)
  executeStep: (
    step: WorkflowStep,
    ctx: OrchestrationContext,
    execCtx: StepExecutionContext
  ) => Promise<void>
): Promise<void> {
  // Resolve the array to iterate over
  const items =
    typeof step.over === 'string' && step.over.startsWith('${')
      ? resolveTemplate(step.over, ctx)
      : step.over;

  if (!Array.isArray(items)) {
    console.warn(`[Orchestration] Loop "over" is not an array: ${step.over}`);
    ctx.artifacts[step.outputKey] = [];
    return;
  }

  console.log(`[Orchestration] Looping over ${items.length} items (mode: ${step.mode})`);

  const results: unknown[] = [];

  // Get the storeKey from first CallStep to know where to find output
  const firstStep = step.steps[0] as CallStep | undefined;
  const outputKey = firstStep?.storeKey;

  if (step.mode === 'parallel') {
    // Parallel loop - each iteration is concurrent (WDK-native Promise.all)
    const iterationResults = await Promise.all(
      items.map(async (item, index) => {
        // Create isolated context for this iteration
        const iterCtx: OrchestrationContext = {
          artifacts: {
            ...ctx.artifacts,
            [step.itemVar]: item,
            [`${step.itemVar}_index`]: index,
          },
          input: ctx.input,
        };

        // Execute loop steps
        for (const loopStep of step.steps) {
          await executeStep(loopStep, iterCtx, execCtx);
        }

        // Return the output from storeKey of first CallStep
        if (outputKey && iterCtx.artifacts[outputKey] !== undefined) {
          return iterCtx.artifacts[outputKey];
        }
        return iterCtx.artifacts[step.itemVar];
      })
    );

    results.push(...iterationResults);
  } else {
    // Sequential loop
    for (let i = 0; i < items.length; i++) {
      ctx.artifacts[step.itemVar] = items[i];
      ctx.artifacts[`${step.itemVar}_index`] = i;

      for (const loopStep of step.steps) {
        await executeStep(loopStep, ctx, execCtx);
      }

      if (outputKey && ctx.artifacts[outputKey] !== undefined) {
        results.push(ctx.artifacts[outputKey]);
      } else {
        results.push(ctx.artifacts[step.itemVar]);
      }
    }
  }

  ctx.artifacts[step.outputKey] = results;
  console.log(
    `[Orchestration] Loop completed, stored ${results.length} results in artifacts.${step.outputKey}`
  );
}
