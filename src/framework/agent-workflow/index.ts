/**
 * Agent Workflow Module - Public API
 *
 * This barrel export maintains backward compatibility with the original
 * agent-workflow.ts file. All consumers can continue to import from
 * './agent-workflow' without changes.
 *
 * @since v4.1
 * @since v4.2 - Refactored to modular structure, added SerializableManifestInfo
 */

// Main workflow function
export { agentWorkflow } from './workflow';

// Public types (backward compatible)
export type { AgentWorkflowParams, AgentWorkflowResult } from './types';

// Internal types (for advanced use cases)
export type {
  OrchestrationContext,
  StepExecutionContext,
  StepExecutor,
  SerializableManifestInfo,
} from './types';

// Serialization helper
export { toSerializableManifestInfo } from './types';

// Helpers (for extension/customization)
export {
  resolveTemplate,
  resolveInputMap,
  evaluateCondition,
  getNestedValue,
  normalizeAgentPath,
  normalizeWorkerPath,
  estimateTokens,
  writeProgress,
  extractProgress,
  createProgressField,
} from './helpers';

// Steps (for custom workflow implementations)
export {
  loadManifestStep,
  executeWorkerStep,
  executeTransformStep,
  executeNestedManagerStep,
  writeProgressStep,
  writeFinishStep,
  closeStreamStep,
  type WorkerStepResult,
} from './steps';

// Orchestration (for custom step executors)
export {
  executeWorkflowStep,
  executeCallStep,
  executeParallelStep,
  executeLoopStep,
  executeConditionalStep,
  executeTransformStepWrapper,
} from './orchestration';
