/**
 * Conditional Step Executor
 *
 * Executes a ConditionalStep - branches based on condition evaluation.
 * Follows Single Responsibility Principle.
 *
 * @since v4.1
 */

import type { ConditionalStep, WorkflowStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';
import { evaluateCondition } from '../helpers';

/**
 * Execute a Conditional step - branch based on condition.
 */
export async function executeConditionalStep(
  step: ConditionalStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext,
  // Recursive executor function (injected to avoid circular dep)
  executeStep: (
    step: WorkflowStep,
    ctx: OrchestrationContext,
    execCtx: StepExecutionContext
  ) => Promise<void>
): Promise<void> {
  const conditionResult = evaluateCondition(step.condition, ctx);

  console.log(`[Orchestration] Condition "${step.condition}" evaluated to: ${conditionResult}`);

  const stepsToExecute = conditionResult ? step.then : (step.else ?? []);

  for (const conditionalStep of stepsToExecute) {
    await executeStep(conditionalStep, ctx, execCtx);
  }
}
