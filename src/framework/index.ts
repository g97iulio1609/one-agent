/**
 * OneAgent SDK v5.0 - Public API
 *
 * Fractal Agent Architecture with MCP Integration
 * v5.0: Removed legacy WDK/durable execution (replaced by @giulio-leone/gaussflow-agent)
 *
 * @example
 * import { execute, createMesh } from './framework';
 *
 * // Simple execution
 * const result = await execute('domains/workout/agents/exercise-selection', input);
 *
 * // Mesh orchestration
 * const mesh = createMesh({
 *   basePath: './domains/workout',
 *   agents: ['agents/exercise-selection', 'agents/workout-planning']
 * });
 * const result = await mesh.run('agents/workout-coordinator', input);
 */

// ==================== ENGINE ====================
export { execute, executeNode, createContext, createMesh } from './engine';
export type { MeshConfig } from './engine';

// ==================== WORKER ====================
export { executeWorker, buildSystemPrompt } from './worker';

// ==================== WORKFLOW ====================
export { executeWorkflow } from './workflow';

// ==================== LOADER ====================
export {
  loadAgentManifest,
  loadSkills,
  loadAgentJsonConfig,
  loadAgentSkills,
  isManager,
  discoverAgents,
} from './loader';

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

// ==================== MCP ====================
export {
  connectToMCPServers,
  mcpToolsToAiSdk,
  disconnectAllMCPServers,
  disconnectMCPServer,
} from './mcp';

// ==================== PERSISTENCE ====================
export { createPrismaAdapter, createInMemoryAdapter } from './persistence';

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
  AGENT_TIMEOUT_PRESETS,
  // v4.1: Progress schema and instructions
  ProgressFieldSchema,
  PROGRESS_PROMPT_INSTRUCTIONS,
  // v4.2: OAuth providers
  OAUTH_PROVIDERS,
  // v5.0: Workflow types
  WORKFLOW_TYPES,
} from './types';

export type { AgentTimeoutPreset, OAuthProvider, WorkflowType } from './types';
