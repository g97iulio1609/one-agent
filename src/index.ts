/**
 * OneAgent SDK 4.2
 *
 * AI Agent framework published as @giulio-leone/one-agent.
 * Durable streaming, skill visibility, and weighted progress.
 * Following KISS, DRY, and SOLID principles.
 *
 * NOTE: Server-only exports (VercelAIProvider, agents, ai-agent-setup)
 * are available via '@giulio-leone/one-agent/server'.
 * This barrel is safe for client components.
 *
 * @packageDocumentation
 */

// Version (single source of truth)
export { SDK_VERSION } from './core/version';
export { SDK_VERSION as VERSION } from './core/version';

// Core
export * from './core/types';
export * from './core/type-helpers';
export * from './core/BaseAgent';
export * from './core/CostCalculator';

// Re-export core AI types (type-only is safe for client)
export { z } from 'zod';
export type { LanguageModel, UIMessage } from 'ai';

// Schemas
export * from './schemas/nutrition.schema';
export * from './schemas/workout.schema';

// Mesh
export * from './mesh/types';
export * from './mesh/PerformanceMonitor';
export * from './mesh/SimpleCache';

// Agent Registry
export * from './registry';

// Hooks (merged from @giulio-leone/one-agent-hooks)
export * from './hooks';

// Copilot services (merged from lib-copilot) — client-safe providers, hooks, components
export * from './copilot';

// Explicit re-exports to resolve ambiguity from duplicate export * statements
export { MacrosSchema } from './schemas/nutrition.schema';
export { SetGroupSchema } from './schemas/workout.schema';
