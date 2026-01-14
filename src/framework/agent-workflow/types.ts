/**
 * Agent Workflow Types
 *
 * Types specific to the durable agent workflow module.
 * Keeps workflow-specific types separate from main framework types.
 *
 * @since v4.1
 * @since v4.2 - Added SerializableManifestInfo for WDK compatibility
 */

import type { UIMessageChunk } from 'ai';
import type {
  AgentManifest,
  AgentConfig,
  WorkflowStep,
  WorkflowDef,
  MCPServerConfig,
} from '../types';

/**
 * Parameters for the agent workflow.
 *
 * CRITICAL: Keep these minimal! WDK serializes all params to CBOR for persistence.
 * Large payloads (system prompts, schemas) will fail to serialize.
 *
 * Instead, pass only identifiers and reconstruct heavy data inside the step.
 */
export interface AgentWorkflowParams {
  /** Agent manifest ID (e.g., "flight-search", "workout-generation") */
  agentId: string;
  /** Base path where sdk-agents/ directory lives */
  basePath: string;
  /** Input data as JSON string (compact) */
  inputJson: string;
  /** User ID for context */
  userId?: string;
  /** Execution ID for tracking */
  executionId: string;
}

/**
 * Result from the agent workflow.
 */
export interface AgentWorkflowResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta: {
    duration: number;
    tokensUsed: number;
    costUSD: number;
  };
}

/**
 * Orchestration context for Manager workflow execution.
 * Simplified, serializable version of Context from types.ts.
 */
export interface OrchestrationContext {
  artifacts: Record<string, unknown>;
  input: unknown;
}

/**
 * Common context passed to step executors.
 * Follows Interface Segregation Principle - only what's needed.
 */
export interface StepExecutionContext {
  writable: WritableStream<UIMessageChunk>;
  /** Serializable manifest info (not full manifest with Zod schemas) */
  manifestInfo: SerializableManifestInfo;
  params: AgentWorkflowParams;
}

/**
 * Type for workflow step executor functions.
 */
export type StepExecutor = (
  step: WorkflowStep,
  ctx: OrchestrationContext,
  execCtx: StepExecutionContext
) => Promise<void>;

/**
 * Serializable version of AgentManifest for WDK steps.
 *
 * WDK requires all step return values to be serializable (plain objects, arrays,
 * primitives, Date, RegExp, Map, Set). Zod schemas are NOT serializable because
 * they contain functions.
 *
 * This type contains only the serializable parts of AgentManifest.
 * The full manifest (with Zod schemas) must be loaded inside each step that needs it.
 *
 * @see https://useworkflow.dev/err/serialization-failed
 * @since v4.2
 */
export interface SerializableManifestInfo {
  /** Agent ID */
  id: string;
  /** Version */
  version: string;
  /** Directory path */
  path: string;
  /** Whether this agent has a workflow (is a Manager) */
  hasWorkflow: boolean;
  /** Workflow definition (serializable - no Zod schemas) */
  workflow?: WorkflowDef;
  /** Agent config (serializable) */
  config: AgentConfig;
  /** MCP server configurations (serializable) */
  mcpServers?: Record<string, MCPServerConfig>;
  /** System prompt (for synthesis step) */
  systemPrompt: string;
}

/**
 * Convert AgentManifest to SerializableManifestInfo.
 * Strips out non-serializable Zod schemas.
 */
export function toSerializableManifestInfo(manifest: AgentManifest): SerializableManifestInfo {
  return {
    id: manifest.id,
    version: manifest.version,
    path: manifest.path,
    hasWorkflow: !!manifest.workflow,
    workflow: manifest.workflow,
    config: manifest.config,
    mcpServers: manifest.mcpServers,
    systemPrompt: manifest.systemPrompt,
  };
}
