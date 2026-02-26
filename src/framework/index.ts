/**
 * OneAgent SDK v4.2 - Public API (client-safe barrel)
 *
 * Only re-exports modules that do NOT depend on Node.js builtins (fs, net, etc.).
 * Server-only modules (engine, loader, worker, durable, wdk-world, workflow,
 * mcp, persistence, api, agent-workflow) must be imported via deep paths, e.g.:
 *   import { execute } from '@giulio-leone/one-agent/framework/engine';
 */

// ==================== PARSER ====================
export { parseWorkflow, hasWorkflow } from './parser';

// ==================== RESOLVER ====================
export {
  resolveTemplate,
  resolvePath,
  resolveInputMap,
  setContextValue,
  evaluateCondition,
  cloneContext,
} from './resolver';

// ==================== SCHEMA REGISTRY ====================
export {
  registerSchemas,
  getSchema,
  hasAgentSchemas,
  getRegisteredSchemaKeys,
  clearSchemaRegistry,
  // Tools registry
  registerTools,
  getAgentTools,
  getRegisteredToolKeys,
  clearToolsRegistry,
  // Transform registry
  registerTransforms,
  getTransform,
  getRegisteredTransformKeys,
  clearTransformRegistry,
  clearAllRegistries,
} from './registry';

// ==================== TYPES ====================
export type {
  // Context
  Context,
  ChatMessage,
  ExecutionMeta,
  ExecutionStatus,

  // Agent
  AgentManifest,
  AgentJsonConfig,
  AgentConfig,
  MCPServerConfig,
  ExecutionMode,

  // Agent v4.2 (skills/tools/progress config)
  AgentSkillsConfig,
  AgentToolsConfig,
  AgentProgressConfig,
  AgentProgressStep,

  // Durability (v4.0)
  DurabilityConfig,
  DurableExecutionResult,
  DurableExecuteOptions,
  WorkflowRunStatus,
  WorkflowEvent,

  // Workflow
  WorkflowDef,
  WorkflowStep,
  CallStep,
  ParallelStep,
  LoopStep,
  ConditionalStep,
  TransformStep,
  TransformFunction,
  InputValue,
  RetryConfig,

  // Progress
  ProgressEvent,
  ProgressCallback,

  // Progress v4.1 (AI-driven)
  ProgressField,
  UIProgressEvent,

  // MCP
  MCPTool,

  // Persistence
  PersistenceAdapter,
  MemoryEntry,

  // Result
  ExecutionResult,
} from './types';

export {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_DURABILITY_CONFIG,
  AGENT_TIMEOUT_PRESETS,
  // v4.1: Progress schema and instructions
  ProgressFieldSchema,
  PROGRESS_PROMPT_INSTRUCTIONS,
  // v4.2: OAuth providers
  OAUTH_PROVIDERS,
} from './types';

export type { AgentTimeoutPreset, OAuthProvider } from './types';

// ==================== SDK 4.0 PRESETS ====================
export {
  DURABILITY_PRESETS,
  AGENT_CONFIG_PRESETS,
  WORKFLOW_TYPES,
  resolveDurabilityPreset,
  createDurableAgentConfig,
} from './sdk4-presets';

export type { DurabilityPreset, AgentConfigPreset, WorkflowType } from './sdk4-presets';
