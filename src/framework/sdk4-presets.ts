/**
 * OneAgent SDK v4.0 - Configuration Presets
 *
 * DRY configuration presets for common agent patterns.
 * Use these to avoid repetition and ensure consistency across agents.
 *
 * @since v4.0
 */

import type { AgentConfig, DurabilityConfig, ModelTier } from './types';
import { AGENT_TIMEOUT_PRESETS } from './types';

// ==================== DURABILITY PRESETS ====================

/**
 * Durability configuration presets for different use cases
 *
 * @example
 * ```json
 * {
 *   "config": {
 *     "executionMode": "durable",
 *     "durability": "standard"  // Resolved by loader
 *   }
 * }
 * ```
 */
export const DURABILITY_PRESETS = {
  /**
   * Standard durability: 10 minute timeout, 3 retries
   * Good for most generation workflows
   */
  standard: {
    enabled: true,
    maxDurationMs: 600_000, // 10 minutes
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
    },
    checkpointStrategy: 'step',
  } satisfies DurabilityConfig,

  /**
   * Extended durability: 30 minute timeout, 5 retries
   * For complex multi-step workflows (workout generation, full plans)
   */
  extended: {
    enabled: true,
    maxDurationMs: 1_800_000, // 30 minutes
    retry: {
      maxAttempts: 5,
      backoffMs: 2000,
      backoffMultiplier: 2,
    },
    checkpointStrategy: 'step',
  } satisfies DurabilityConfig,

  /**
   * Quick durability: 5 minute timeout, 2 retries
   * For simpler durable operations (validation, parsing)
   */
  quick: {
    enabled: true,
    maxDurationMs: 300_000, // 5 minutes
    retry: {
      maxAttempts: 2,
      backoffMs: 500,
      backoffMultiplier: 2,
    },
    checkpointStrategy: 'step',
  } satisfies DurabilityConfig,

  /**
   * Critical durability: 1 hour timeout, 10 retries with aggressive checkpoint
   * For mission-critical workflows that must complete
   */
  critical: {
    enabled: true,
    maxDurationMs: 3_600_000, // 1 hour
    retry: {
      maxAttempts: 10,
      backoffMs: 1000,
      backoffMultiplier: 1.5,
    },
    checkpointStrategy: 'both', // Checkpoint on step AND tool
  } satisfies DurabilityConfig,
} as const;

export type DurabilityPreset = keyof typeof DURABILITY_PRESETS;

// ==================== AGENT CONFIG PRESETS ====================

/**
 * Base agent configuration factory
 * Creates a consistent config with SDK 4.0 defaults
 */
function createAgentConfig(overrides: Partial<AgentConfig> & { tier?: ModelTier }): AgentConfig {
  return {
    tier: overrides.tier ?? 'balanced',
    temperature: 1, // Full creativity
    maxSteps: overrides.maxSteps ?? 10,
    maxTokens: overrides.maxTokens ?? 4096,
    timeout: overrides.timeout ?? AGENT_TIMEOUT_PRESETS.standard,
    executionMode: overrides.executionMode ?? 'durable',
    skipSynthesis: overrides.skipSynthesis,
    outputArtifact: overrides.outputArtifact,
    durability: overrides.durability,
  };
}

/**
 * Pre-configured agent presets for common patterns
 *
 * Usage in agent.json:
 * ```json
 * {
 *   "config": { "$preset": "orchestrator" }
 * }
 * ```
 * Or import directly in TypeScript for reference
 */
export const AGENT_CONFIG_PRESETS = {
  /**
   * Worker agent: Fast, single-purpose tasks
   * - Fast tier model
   * - Short timeout
   * - Durable with quick retry
   */
  worker: createAgentConfig({
    tier: 'fast',
    maxSteps: 5,
    maxTokens: 4096,
    timeout: AGENT_TIMEOUT_PRESETS.fast,
    executionMode: 'durable',
    durability: DURABILITY_PRESETS.quick,
  }),

  /**
   * Standard agent: Balanced performance/quality
   * - Balanced tier model
   * - Medium timeout
   * - Standard durability
   */
  standard: createAgentConfig({
    tier: 'balanced',
    maxSteps: 15,
    maxTokens: 8192,
    timeout: AGENT_TIMEOUT_PRESETS.standard,
    executionMode: 'durable',
    durability: DURABILITY_PRESETS.standard,
  }),

  /**
   * Orchestrator/Manager: Coordinates multiple workers
   * - Balanced tier for decision-making
   * - High step limit
   * - Extended timeout and durability
   * - skipSynthesis for direct artifact output
   */
  orchestrator: createAgentConfig({
    tier: 'balanced',
    maxSteps: 50,
    maxTokens: 8192,
    timeout: AGENT_TIMEOUT_PRESETS.extended,
    executionMode: 'durable',
    skipSynthesis: true,
    durability: DURABILITY_PRESETS.extended,
  }),

  /**
   * Generator: Creates complex outputs (workout programs, nutrition plans)
   * - Reasoning tier for best quality
   * - Maximum timeout
   * - Extended durability with more retries
   */
  generator: createAgentConfig({
    tier: 'quality',
    maxSteps: 30,
    maxTokens: 16384,
    timeout: AGENT_TIMEOUT_PRESETS.extended,
    executionMode: 'durable',
    durability: DURABILITY_PRESETS.extended,
  }),

  /**
   * Validator: Quick validation and parsing
   * - Fast tier for speed
   * - Minimal steps
   * - Quick durability
   */
  validator: createAgentConfig({
    tier: 'fast',
    maxSteps: 3,
    maxTokens: 2048,
    timeout: AGENT_TIMEOUT_PRESETS.fast,
    executionMode: 'durable',
    durability: DURABILITY_PRESETS.quick,
  }),

  /**
   * Copilot/Chat: Interactive assistant
   * - Balanced tier
   * - Stream mode for real-time response
   * - No durability needed (stateless)
   */
  copilot: createAgentConfig({
    tier: 'balanced',
    maxSteps: 20,
    maxTokens: 8192,
    timeout: AGENT_TIMEOUT_PRESETS.complex,
    executionMode: 'stream', // Chat needs streaming
    durability: undefined, // No durability for chat
  }),
} as const;

export type AgentConfigPreset = keyof typeof AGENT_CONFIG_PRESETS;

// ==================== WORKFLOW TYPE CONSTANTS ====================

/**
 * Workflow type identifiers for tracking and filtering
 * Used in workflow.workflow_runs.workflow_type column
 */
export const WORKFLOW_TYPES = {
  WORKOUT_GENERATION: 'workout-generation',
  NUTRITION_GENERATION: 'nutrition-generation',
  AGENDA_PLANNING: 'agenda-planning',
  EXERCISE_GENERATION: 'exercise-generation',
  FOOD_GENERATION: 'food-generation',
  SHOPPING_GENERATION: 'shopping-generation',
  COPILOT_CHAT: 'copilot-chat',
} as const;

export type WorkflowType = (typeof WORKFLOW_TYPES)[keyof typeof WORKFLOW_TYPES];

// ==================== HELPER FUNCTIONS ====================

/**
 * Resolve a durability preset to its config
 */
export function resolveDurabilityPreset(
  presetOrConfig: DurabilityPreset | DurabilityConfig | undefined
): DurabilityConfig | undefined {
  if (!presetOrConfig) return undefined;
  if (typeof presetOrConfig === 'string') {
    return DURABILITY_PRESETS[presetOrConfig];
  }
  return presetOrConfig;
}

/**
 * Create a durable agent config with specific workflow type
 * Convenience function for creating consistent configs
 */
export function createDurableAgentConfig(options: {
  preset?: AgentConfigPreset;
  workflowType: WorkflowType;
  outputArtifact: string;
  overrides?: Partial<AgentConfig>;
}): AgentConfig {
  const baseConfig = options.preset
    ? AGENT_CONFIG_PRESETS[options.preset]
    : AGENT_CONFIG_PRESETS.orchestrator;

  return {
    ...baseConfig,
    outputArtifact: options.outputArtifact,
    ...options.overrides,
  };
}

export default {
  DURABILITY_PRESETS,
  AGENT_CONFIG_PRESETS,
  WORKFLOW_TYPES,
  resolveDurabilityPreset,
  createDurableAgentConfig,
};
