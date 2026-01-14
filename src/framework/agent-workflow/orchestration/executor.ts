/**
 * Step Executor (Router)
 *
 * Routes workflow step execution to the appropriate executor.
 * Follows Open/Closed Principle - easy to add new step types.
 *
 * @since v4.1
 */

import type { WorkflowStep } from '../../types';
import type { OrchestrationContext, StepExecutionContext } from '../types';
import { executeCallStep } from './call';
import { executeParallelStep } from './parallel';
import { executeLoopStep } from './loop';
import { executeConditionalStep } from './conditional';
import { executeTransformStepWrapper } from './transform';

// Forward reference type for agentWorkflow
type AgentWorkflowFn = Parameters<typeof executeCallStep>[3];

/**
 * Execute a single workflow step based on its type.
 * Called from the main workflow function for each step in WORKFLOW.md.
 *
 * NOTE: This function is called from the workflow, NOT from a step.
 * All step function calls are made directly here to maintain WDK durability.
 */
export async function executeWorkflowStep(
  step: WorkflowStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext,
  agentWorkflow: AgentWorkflowFn
): Promise<void> {
  console.log(`[Orchestration] Executing step: ${step.name} (${step.type})`);

  // Create recursive executor that binds agentWorkflow
  const recursiveExecutor = (s: WorkflowStep, c: OrchestrationContext, e: StepExecutionContext) =>
    executeWorkflowStep(s, c, e, agentWorkflow);

  switch (step.type) {
    case 'call':
      await executeCallStep(step, ctx, execCtx, agentWorkflow);
      break;

    case 'parallel':
      await executeParallelStep(step, ctx, execCtx, recursiveExecutor);
      break;

    case 'loop':
      await executeLoopStep(step, ctx, execCtx, recursiveExecutor);
      break;

    case 'conditional':
      await executeConditionalStep(step, ctx, execCtx, recursiveExecutor);
      break;

    case 'transform':
      await executeTransformStepWrapper(step, ctx, execCtx);
      break;

    default:
      console.warn(`[Orchestration] Unknown step type: ${(step as WorkflowStep).type}`);
  }
}
